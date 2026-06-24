param(
  [switch]$RunDemos
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Assert-True($condition, $message) {
  if (-not $condition) {
    throw $message
  }
}

function Assert-File($relativePath) {
  $path = Join-Path $root $relativePath
  Assert-True (Test-Path -LiteralPath $path) "Missing required file: $relativePath"
  return $path
}

function Get-RelativeMarkdownTargets([string]$content) {
  $targets = New-Object System.Collections.Generic.List[string]

  [regex]::Matches($content, '!\[[^\]]*\]\(([^)]+)\)') | ForEach-Object {
    $targets.Add($_.Groups[1].Value)
  }

  [regex]::Matches($content, '<(?:img|a)\s+[^>]*(?:src|href)="([^"]+)"') | ForEach-Object {
    $targets.Add($_.Groups[1].Value)
  }

  return $targets |
    Where-Object {
      $_ -and
      -not ($_.StartsWith("http://")) -and
      -not ($_.StartsWith("https://")) -and
      -not ($_.StartsWith("#")) -and
      -not ($_.StartsWith("mailto:"))
    } |
    ForEach-Object {
      ($_ -split "#")[0]
    } |
    Where-Object { $_ }
}

$skillPath = Assert-File "SKILL.md"
$readmePath = Assert-File "README.md"
$openaiYamlPath = Assert-File "agents\openai.yaml"
Assert-File "references\asset-manifest-and-prompts.md" | Out-Null
Assert-File "references\image2-entrypoint.md" | Out-Null
Assert-File "references\hicolor-case-study.md" | Out-Null
Assert-File "assets\cases\hicolor\traffic-3-days.png" | Out-Null
Assert-File "assets\cases\hicolor\xiaohongshu-pinned.jpg" | Out-Null
Assert-File "assets\cases\hicolor\threads-recommendation.png" | Out-Null

$skill = Get-Content -LiteralPath $skillPath -Raw -Encoding UTF8
$readme = Get-Content -LiteralPath $readmePath -Raw -Encoding UTF8
$openaiYaml = Get-Content -LiteralPath $openaiYamlPath -Raw -Encoding UTF8

Assert-True ($skill.Contains("name: image-to-ui-skill")) "SKILL.md frontmatter must contain the expected name"
Assert-True ($skill.Contains("description:")) "SKILL.md frontmatter must contain description"
Assert-True ($skill.Contains("references/image2-entrypoint.md")) "SKILL.md should reference image2-entrypoint.md"
Assert-True ($skill.Contains("references/asset-manifest-and-prompts.md")) "SKILL.md should reference asset-manifest-and-prompts.md"
Assert-True ($skill.Contains("本地 imagegen")) "SKILL.md should require local imagegen as the default image2 path"
Assert-True ($skill.Contains("scripts/image2_asset.py")) "SKILL.md should document the local API fallback wrapper"
Assert-True ($skill.Contains("local-api-imagegen-cli")) "SKILL.md should require reporting the local API fallback channel"
Assert-True ($skill.Contains("OPENAI_API_KEY")) "SKILL.md should document local API fallback credential boundaries"
Assert-True ($skill.Contains("Dynamic Island")) "SKILL.md should keep iOS app preview requirements"
Assert-File "scripts\image2_asset.py" | Out-Null

Assert-True ($openaiYaml.Contains("display_name:")) "agents/openai.yaml missing display_name"
Assert-True ($openaiYaml.Contains("short_description:")) "agents/openai.yaml missing short_description"
Assert-True ($openaiYaml.Contains("default_prompt:")) "agents/openai.yaml missing default_prompt"

$targets = Get-RelativeMarkdownTargets $readme
foreach ($target in $targets) {
  $normalized = $target.Replace("/", [IO.Path]::DirectorySeparatorChar)
  $candidate = Join-Path $root $normalized
  Assert-True (Test-Path -LiteralPath $candidate) "README references missing local target: $target"
}

$demoRoots = @(
  "demo\artmuse-ios",
  "demo\marble-note"
)

foreach ($demo in $demoRoots) {
  Assert-File (Join-Path $demo "index.html") | Out-Null
  Assert-File (Join-Path $demo "styles.css") | Out-Null
  Assert-File (Join-Path $demo "script.js") | Out-Null
  Assert-File (Join-Path $demo "README.md") | Out-Null
  Assert-File (Join-Path $demo "validate.ps1") | Out-Null
}

$results = [System.Collections.Generic.List[object]]::new()
$results.Add([pscustomobject]@{
  Check = "skill-structure"
  Ok = $true
  Url = $null
  Screenshot = $null
  Initial = $null
  BrokenImages = $null
  Detail = "SKILL.md, references, README links, agents metadata, and demo file structure passed"
})

if ($RunDemos) {
  foreach ($demo in $demoRoots) {
    $script = Join-Path $root (Join-Path $demo "validate.ps1")
    $output = & $script
    $demoResult = @($output | Where-Object { $_ -is [pscustomobject] })[-1]
    Assert-True $demoResult "Demo validator did not return a result object: $demo"
    $results.Add([pscustomobject]@{
      Check = $demo
      Ok = [bool]$demoResult.Ok
      Url = $demoResult.Url
      Screenshot = $demoResult.Screenshot
      Initial = $demoResult.Initial
      BrokenImages = $demoResult.BrokenImages
      Detail = $demoResult
    })
  }
}

$results
