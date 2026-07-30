#!/usr/bin/env python3
"""Fallback API wrapper for image2 UI bitmap assets.

The skill's default image2 path is the local `imagegen` skill. Use this script
only after local imagegen is unavailable or fails and an API fallback is allowed.

This wrapper delegates to the local imagegen CLI fallback:

    $CODEX_HOME/skills/.system/imagegen/scripts/image_gen.py

It keeps the image-to-ui skill on a repeatable local API path without inventing
one-off SDK calls.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def _imagegen_cli() -> Path:
    configured = os.environ.get("IMAGEGEN_CLI")
    if configured:
        return Path(configured)
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    return codex_home / "skills" / ".system" / "imagegen" / "scripts" / "image_gen.py"


def _api_command(args: argparse.Namespace) -> list[str]:
    cli = _imagegen_cli()
    command = [
        sys.executable,
        str(cli),
        args.action,
    ]
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
    return command


def _run(command: list[str], dry_run: bool) -> int:
    printable = subprocess.list2cmdline(command)
    if dry_run:
        print(printable)
        return 0
    completed = subprocess.run(command)
    return completed.returncode


def _api_ready() -> tuple[bool, str]:
    cli = _imagegen_cli()
    if not cli.exists():
        return False, f"local imagegen API CLI not found: {cli}"
    if not os.environ.get("OPENAI_API_KEY"):
        return False, "OPENAI_API_KEY is required for local API fallback"
    return True, "ok"


def _doctor() -> int:
    cli = _imagegen_cli()
    report = {
        "system_imagegen": {
            "path": str(cli),
            "available": cli.exists(),
            "counts_as_native_image2": True,
        },
        "fallback": {
            "channel": "local-api-imagegen-cli",
            "openai_api_key_present": bool(os.environ.get("OPENAI_API_KEY")),
            "model": "gpt-image-2",
        },
        "built_in_tool_detectable_from_shell": False,
    }
    import json

    print(json.dumps(report, indent=2))
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fallback local API wrapper for image2 UI assets after local imagegen fails."
    )
    subparsers = parser.add_subparsers(dest="action", required=True)

    def add_common(sub: argparse.ArgumentParser) -> None:
        sub.add_argument("--prompt", required=True)
        sub.add_argument("--output", required=True, type=Path)
        sub.add_argument("--size", default="1024x1024")
        sub.add_argument("--quality", default="medium", choices=["low", "medium", "high", "auto"])
        sub.add_argument("--output-format", "--output_format", dest="output_format", default="png", choices=["png", "jpeg", "webp"])
        sub.add_argument("--model", default="gpt-image-2")
        sub.add_argument("--force", action="store_true")
        sub.add_argument("--dry-run", action="store_true")

    generate = subparsers.add_parser("generate", help="Generate an image from a text prompt.")
    add_common(generate)

    edit = subparsers.add_parser("edit", help="Edit images or use reference images.")
    edit.add_argument("--image", action="append", required=True, type=Path)
    add_common(edit)

    subparsers.add_parser("doctor", help="Report native imagegen and API fallback availability.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.action == "doctor":
        return _doctor()

    args.output.parent.mkdir(parents=True, exist_ok=True)

    ready, reason = _api_ready()
    if not ready and not args.dry_run:
        print(f"[image2-asset] local API fallback unavailable: {reason}", file=sys.stderr)
        return 3

    command = _api_command(args)
    print("[image2-asset] channel=local-api-imagegen-cli")
    return _run(command, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
