#!/usr/bin/env python3
"""Repeatable image2 asset wrapper for image-to-UI work.

The wrapper prefers a project-provided image2 command when one is configured or
available on PATH, then falls back to the bundled imagegen CLI when API fallback
credentials are present. It keeps channel reporting and provenance consistent so
agents do not accidentally describe placeholders or CSS as generated assets.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Channel:
    id: str
    label: str
    source: str
    command: list[str]
    available: bool
    reason: str
    requires_api_key: bool = False


def _codex_home() -> Path:
    return Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))


def _imagegen_cli() -> Path:
    configured = os.environ.get("IMAGEGEN_CLI")
    if configured:
        return Path(configured)
    return _codex_home() / "skills" / ".system" / "imagegen" / "scripts" / "image_gen.py"


def _api_key_present() -> bool:
    return any(
        os.environ.get(name)
        for name in ("OPENAI_API_KEY", "YOUTOKEN_IMAGE_API_KEY", "OPENROUTER_ICU_API_KEY")
    ) or (_codex_home() / "youtoken-image.env").exists()


def _project_image2_channel(args: argparse.Namespace) -> Channel:
    configured = os.environ.get("IMAGE2_COMMAND")
    if configured:
        command = shlex.split(configured)
        executable = command[0] if command else ""
        available = _command_available(executable)
        reason = "configured by IMAGE2_COMMAND" if available else f"IMAGE2_COMMAND executable not found: {executable or '<empty>'}"
    else:
        found = shutil.which("image2")
        command = [found] if found else ["image2"]
        available = bool(found)
        reason = "found image2 on PATH" if found else "image2 command not found on PATH"

    return Channel(
        id="project-image2",
        label="native-image2",
        source="project-image2",
        command=command + _common_image_args(args),
        available=available,
        reason=reason,
    )


def _command_available(executable: str) -> bool:
    if not executable:
        return False
    candidate = Path(executable).expanduser()
    if candidate.is_absolute() or any(separator in executable for separator in (os.sep, os.altsep) if separator):
        return candidate.exists() and os.access(candidate, os.X_OK)
    return shutil.which(executable) is not None


def _fallback_channel(args: argparse.Namespace) -> Channel:
    cli = _imagegen_cli()
    available = cli.exists() and _api_key_present()
    if not cli.exists():
        reason = f"local imagegen CLI not found: {cli}"
    elif not _api_key_present():
        reason = "OPENAI_API_KEY, YOUTOKEN_IMAGE_API_KEY, OPENROUTER_ICU_API_KEY, or ~/.codex/youtoken-image.env is required"
    else:
        reason = "local imagegen CLI and API credential detected"

    command = [sys.executable, str(cli), args.action]
    if args.action == "edit":
        for image in args.image:
            command.extend(["--image", str(image)])
    command.extend(
        [
            "--prompt",
            args.prompt,
            "--out",
            str(args.output),
            "--model",
            args.model,
            "--size",
            args.size,
            "--quality",
            args.quality,
            "--output-format",
            args.output_format,
        ]
    )
    if args.force:
        command.append("--force")

    return Channel(
        id="openai-imagegen-cli",
        label="native-image2",
        source="openai-imagegen-cli",
        command=command,
        available=available,
        reason=reason,
        requires_api_key=True,
    )


def _common_image_args(args: argparse.Namespace) -> list[str]:
    command = [args.action]
    if args.action == "edit":
        for image in args.image:
            command.extend(["--image", str(image)])
    command.extend(
        [
            "--prompt",
            args.prompt,
            "--output",
            str(args.output),
            "--model",
            args.model,
            "--size",
            args.size,
            "--quality",
            args.quality,
            "--output-format",
            args.output_format,
        ]
    )
    if args.force:
        command.append("--force")
    return command


def _candidate_channels(args: argparse.Namespace) -> list[Channel]:
    channels = [_project_image2_channel(args), _fallback_channel(args)]
    if args.prefer == "image2":
        return channels[:1]
    if args.prefer == "fallback":
        return channels[1:]
    return channels


def _run_channel(channel: Channel, args: argparse.Namespace) -> int:
    printable = subprocess.list2cmdline(channel.command)
    print(f"[image2-asset] channel={channel.label} source={channel.source}")
    print(f"[image2-asset] command={printable}")
    if args.dry_run:
        return 0

    completed = subprocess.run(channel.command)
    if completed.returncode != 0:
        return completed.returncode
    if not args.output.exists() or args.output.stat().st_size == 0:
        print(
            f"[image2-asset] command succeeded but output is missing or empty: {args.output}",
            file=sys.stderr,
        )
        return 4
    _write_provenance(channel, args)
    return 0


def _write_provenance(channel: Channel, args: argparse.Namespace) -> None:
    provenance_path = args.provenance or args.output.with_suffix(f"{args.output.suffix}.provenance.json")
    provenance = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "channel": channel.label,
        "source": channel.source,
        "action": args.action,
        "output": str(args.output),
        "prompt": args.prompt,
        "model": args.model,
        "size": args.size,
        "quality": args.quality,
        "output_format": args.output_format,
        "images": [str(image) for image in getattr(args, "image", [])],
        "command": _redact_command(channel.command),
    }
    provenance_path.parent.mkdir(parents=True, exist_ok=True)
    provenance_path.write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[image2-asset] provenance={provenance_path}")


def _redact_command(command: list[str]) -> list[str]:
    redacted = []
    secret_names = ("OPENAI_API_KEY", "YOUTOKEN_IMAGE_API_KEY", "OPENROUTER_ICU_API_KEY")
    secret_values = [os.environ.get(name) for name in secret_names if os.environ.get(name)]
    for part in command:
        safe = str(part)
        for value in secret_values:
            safe = safe.replace(value, "***")
        redacted.append(safe)
    return redacted


def _doctor() -> int:
    fake_args = argparse.Namespace(
        action="generate",
        prompt="doctor",
        output=Path("doctor-output.png"),
        image=[],
        model="gpt-image-2",
        size="1024x1024",
        quality="medium",
        output_format="png",
        force=False,
        prefer="auto",
    )
    channels = [_project_image2_channel(fake_args), _fallback_channel(fake_args)]
    report = {
        "status": "ready" if any(channel.available for channel in channels) else "unavailable",
        "built_in_tool_detectable_from_shell": False,
        "note": "The Codex built-in image generation tool is detected by the agent tool surface, not by this shell doctor.",
        "channels": [
            {
                **asdict(channel),
                "command": _redact_command(channel.command),
            }
            for channel in channels
        ],
        "credentials": {
            "OPENAI_API_KEY": bool(os.environ.get("OPENAI_API_KEY")),
            "YOUTOKEN_IMAGE_API_KEY": bool(os.environ.get("YOUTOKEN_IMAGE_API_KEY")),
            "OPENROUTER_ICU_API_KEY": bool(os.environ.get("OPENROUTER_ICU_API_KEY")),
            "codex_youtoken_env": (_codex_home() / "youtoken-image.env").exists(),
        },
    }
    print(json.dumps(report, indent=2))
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate or edit image2 UI bitmap assets with channel provenance.")
    subparsers = parser.add_subparsers(dest="action", required=True)

    def add_common(sub: argparse.ArgumentParser) -> None:
        sub.add_argument("--prompt", required=True)
        sub.add_argument("--output", required=True, type=Path)
        sub.add_argument("--size", default="1024x1024")
        sub.add_argument("--quality", default="medium", choices=["low", "medium", "high", "auto"])
        sub.add_argument("--output-format", "--output_format", dest="output_format", default="png", choices=["png", "jpeg", "webp"])
        sub.add_argument("--model", default="gpt-image-2")
        sub.add_argument("--prefer", default="auto", choices=["auto", "image2", "fallback"])
        sub.add_argument("--provenance", type=Path, help="Optional path for the generated provenance JSON.")
        sub.add_argument("--force", action="store_true")
        sub.add_argument("--dry-run", action="store_true")

    generate = subparsers.add_parser("generate", help="Generate an image from a text prompt.")
    add_common(generate)

    edit = subparsers.add_parser("edit", help="Edit images or use reference images.")
    edit.add_argument("--image", action="append", required=True, type=Path)
    add_common(edit)

    subparsers.add_parser("doctor", help="Report native image2 and API fallback channel availability.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.action == "doctor":
        return _doctor()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    channels = _candidate_channels(args)
    attempted = []
    for channel in channels:
        if not channel.available and not args.dry_run:
            print(f"[image2-asset] skip source={channel.source}: {channel.reason}", file=sys.stderr)
            continue
        attempted.append(channel.source)
        status = _run_channel(channel, args)
        if status == 0:
            return 0
        print(f"[image2-asset] source={channel.source} failed with status {status}", file=sys.stderr)
        if args.prefer in {"image2", "fallback"}:
            return status

    print(
        "[image2-asset] no usable image2 channel completed. "
        f"attempted={attempted or 'none'} prefer={args.prefer}",
        file=sys.stderr,
    )
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
