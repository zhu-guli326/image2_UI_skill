param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Assert-File([string]$RelativePath) {
  $path = Join-Path $root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing required Skill file: $RelativePath"
  }
}

function Invoke-PythonCompile() {
  if ($env:PYTHON) {
    & $env:PYTHON -m py_compile scripts/image2_asset.py
    return
  }

  if (Get-Command python3 -ErrorAction SilentlyContinue) {
    & python3 -m py_compile scripts/image2_asset.py
    return
  }

  if (Get-Command python -ErrorAction SilentlyContinue) {
    & python -m py_compile scripts/image2_asset.py
    return
  }

  if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 -m py_compile scripts/image2_asset.py
    return
  }

  throw "Python 3.10 or newer is required"
}

$requiredFiles = @(
  "SKILL.md",
  "README.md",
  "PRODUCTION.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "LICENSE",
  "package.json",
  "agents/openai.yaml",
  "assets/readme/hero.png",
  "scripts/doctor.mjs",
  "scripts/image2-ui",
  "scripts/image2_asset.py",
  "scripts/image2_orchestrate.mjs",
  "scripts/workflow_state_machine.mjs",
  "scripts/ui_compare.mjs",
  "scripts/ui_loop.mjs",
  "scripts/ui_output_audit.mjs",
  "references/asset-manifest-and-prompts.md",
  "references/fashion-shopping-app-case-study.md",
  "references/hicolor-case-study.md",
  "references/icon-system.md",
  "references/image2-entrypoint.md",
  "references/loop-engineering.md",
  "references/motion-system.md",
  "references/multi-agent-orchestration.md",
  "references/museum-app-case-study.md",
  "references/ui-section-vocabulary.md",
  "references/ui-section-vocabulary.zh.md"
)

foreach ($file in $requiredFiles) {
  Assert-File $file
}

Push-Location $root
try {
  & node --test
  if ($LASTEXITCODE -ne 0) {
    throw "node --test failed with exit code $LASTEXITCODE"
  }

  & npm pack --dry-run
  if ($LASTEXITCODE -ne 0) {
    throw "npm pack --dry-run failed with exit code $LASTEXITCODE"
  }

  $cacheRoot = Join-Path ([IO.Path]::GetTempPath()) ("image2-ui-pycache-" + [guid]::NewGuid())
  $previousCacheRoot = $env:PYTHONPYCACHEPREFIX
  try {
    $env:PYTHONPYCACHEPREFIX = $cacheRoot
    Invoke-PythonCompile
    if ($LASTEXITCODE -ne 0) {
      throw "Python syntax validation failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    $env:PYTHONPYCACHEPREFIX = $previousCacheRoot
    if (Test-Path -LiteralPath $cacheRoot) {
      Remove-Item -LiteralPath $cacheRoot -Recurse -Force
    }
  }
}
finally {
  Pop-Location
}

Write-Host "Skill validation passed."
