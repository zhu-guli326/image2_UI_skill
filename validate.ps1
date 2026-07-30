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
Assert-File "references\icon-system.md" | Out-Null
Assert-File "references\multi-agent-orchestration.md" | Out-Null
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
Assert-True ($skill.Contains("references/icon-system.md")) "SKILL.md should reference icon-system.md"
Assert-True ($skill.Contains("imagegen")) "SKILL.md should explicitly mention imagegen boundaries"
Assert-True ($skill.Contains("scripts/image2_asset.py")) "SKILL.md should document the image2 fallback wrapper"
Assert-True ($skill.Contains("native-image2")) "SKILL.md should require reporting the native image2 channel"
Assert-True ($skill.Contains("source=system-imagegen")) "SKILL.md should treat system imagegen as a native-image2 source"
Assert-True ($skill.Contains("source=project-image2")) "SKILL.md should document project image2 as a native-image2 source"
Assert-True ($skill.Contains("youtoken-gpt-image-2")) "SKILL.md should require reporting the Youtoken fallback channel"
Assert-True ($skill.Contains("openrouter-icu-gpt-image-2")) "SKILL.md should require reporting the OpenRouter ICU fallback channel"
Assert-True ($skill.Contains("source=openai-imagegen-cli")) "SKILL.md should name explicit system imagegen CLI usage as a native source"
Assert-True ($skill.Contains("OPENAI_API_KEY")) "SKILL.md should document fallback credential boundaries"
Assert-True ($skill.Contains("image2-ui doctor")) "SKILL.md should document image2 channel diagnosis"
Assert-True ($skill.Contains("image_gen")) "SKILL.md should distinguish the built-in image_gen tool surface"
Assert-True ($skill.Contains("Dynamic Island")) "SKILL.md should keep iOS app preview requirements"
Assert-True ($skill.Contains("Page Output Audit Loop")) "SKILL.md should document the page output audit loop"
Assert-True ($skill.Contains("Design, Icons, And Layout")) "SKILL.md should include design, icon, and layout rules"
Assert-True ($skill.Contains("icon + heading + paragraph")) "SKILL.md should reject repeated icon-card grids"
Assert-True ($skill.Contains("44x44px")) "SKILL.md should document minimum touch target size"
Assert-True ($skill.Contains("text-wrap: balance")) "SKILL.md should document heading wrapping quality"
Assert-True ($skill.Contains("UI Glyph Lock Rule")) "SKILL.md should include the UI glyph lock rule"
Assert-True ($skill.Contains("no icons, no UI symbols")) "SKILL.md should require image2 prompts to exclude UI glyphs"
Assert-True ($skill.Contains("battery/Wi-Fi/signal")) "SKILL.md should force status glyphs to be code-rendered"
Assert-True ($skill.Contains("Classify by role, not name")) "SKILL.md should classify image assets by UI role, not only by filename"
Assert-True ($skill.Contains("product-cutout")) "SKILL.md should distinguish product cutouts from UI glyphs"
Assert-True ($skill.Contains("object-thumbnail")) "SKILL.md should distinguish object thumbnails from UI glyphs"
Assert-True ($skill.Contains("icon coverage table")) "SKILL.md should require icon coverage tracking"
Assert-True ($skill.Contains("@phosphor-icons/react")) "SKILL.md should allow the Phosphor React icon library"
Assert-True ($skill.Contains("hugeicons-react")) "SKILL.md should allow the Hugeicons React icon library"
Assert-True ($skill.Contains("@radix-ui/react-icons")) "SKILL.md should allow the Radix UI icon library"
Assert-True ($skill.Contains("@tabler/icons-react")) "SKILL.md should allow the Tabler React icon library"
Assert-True ($skill.Contains("UiIcon")) "SKILL.md should require a unified UiIcon/IconRegistry/SVG sprite entry"
Assert-True ($skill.Contains("ui_output_audit.mjs")) "SKILL.md should reference the bundled UI output audit script"
Assert-True ($skill.Contains("image2-ui validate")) "SKILL.md should document the image2-ui validate command"
Assert-True ($skill.Contains("Multi-Agent Orchestration")) "SKILL.md should document multi-agent orchestration"
Assert-True ($skill.Contains("visual-analyst")) "SKILL.md should document the visual analyst role"
Assert-True ($skill.Contains("asset-engineer")) "SKILL.md should document the asset engineer role"
Assert-True ($skill.Contains("ui-architect")) "SKILL.md should document the UI architect role"
Assert-True ($skill.Contains("backend-contract")) "SKILL.md should document the backend contract role"
Assert-True ($skill.Contains("state-machine")) "SKILL.md should document the state machine role"
Assert-True ($skill.Contains("accessibility")) "SKILL.md should document the accessibility role"
Assert-True ($skill.Contains("release")) "SKILL.md should document the release role"
Assert-True ($skill.Contains("qa-auditor")) "SKILL.md should document the QA auditor role"
Assert-True ($skill.Contains("multi-agent execution is unavailable")) "SKILL.md should document single-agent fallback"

Assert-True ($readme.Contains("When To Use")) "README should include usage context"
Assert-True ($readme.Contains("Usage")) "README should include usage"
Assert-True ($readme.Contains("Key Rules")) "README should include key rules"
Assert-True ($readme.Contains("&#")) "README should include Chinese rendered through HTML entities"

$image2AssetPath = Assert-File "scripts\image2_asset.py"
Assert-File "scripts\ui_output_audit.mjs" | Out-Null
Assert-File "scripts\image2-ui" | Out-Null
Assert-File "package.json" | Out-Null

$image2Asset = Get-Content -LiteralPath $image2AssetPath -Raw -Encoding UTF8
Assert-True ($image2Asset.Contains("local imagegen")) "image2_asset.py should describe the local imagegen fallback"
Assert-True ($image2Asset.Contains("OPENAI_API_KEY")) "image2_asset.py should document fallback credential requirements"
Assert-True ($image2Asset.Contains("channel=local-api-imagegen-cli")) "image2_asset.py should report the fallback channel"
Assert-True ($image2Asset.Contains("counts_as_native_image2")) "image2_asset.py doctor should report native image2 classification"
Assert-True ($image2Asset.Contains("built_in_tool_detectable_from_shell")) "image2_asset.py doctor should report built-in tool detection limits"

$doctorOutput = & node (Join-Path $root "scripts\image2-ui") doctor
Assert-True ($LASTEXITCODE -eq 0) "image2-ui doctor should exit successfully"
Assert-True (($doctorOutput -join "`n").Contains("local-api-imagegen-cli")) "image2-ui doctor should report the fallback channel"

$auditPath = Join-Path $root "scripts\ui_output_audit.mjs"
$auditScript = Get-Content -LiteralPath $auditPath -Raw -Encoding UTF8
Assert-True ($auditScript.Contains("unlabeled-icon-button")) "ui_output_audit.mjs should check icon-only controls"
Assert-True ($auditScript.Contains("small-touch-target")) "ui_output_audit.mjs should check touch target sizes"
Assert-True ($auditScript.Contains("repeated-icon-card-grid")) "ui_output_audit.mjs should detect repeated icon-card grids"
Assert-True ($auditScript.Contains("generated-ui-glyph-asset")) "ui_output_audit.mjs should warn on raster UI glyph assets"
Assert-True ($auditScript.Contains("image-icon-in-control")) "ui_output_audit.mjs should warn on raster image icons in controls"
Assert-True ($auditScript.Contains("classifyRasterAssetRole")) "ui_output_audit.mjs should classify raster assets by UI role"
Assert-True ($auditScript.Contains("cutout-asset-missing-alt")) "ui_output_audit.mjs should check alt text for product/cutout assets"
Assert-True ($auditScript.Contains("mixed-icon-tech")) "ui_output_audit.mjs should warn on mixed icon technologies"
Assert-True ($auditScript.Contains("@phosphor-icons/react")) "ui_output_audit.mjs should know the approved Phosphor icon package"
Assert-True ($auditScript.Contains("hugeicons-react")) "ui_output_audit.mjs should know the approved Hugeicons package"
Assert-True ($auditScript.Contains("@radix-ui/react-icons")) "ui_output_audit.mjs should know the approved Radix icon package"
Assert-True ($auditScript.Contains("@tabler/icons-react")) "ui_output_audit.mjs should know the approved Tabler icon package"

Assert-True ($openaiYaml.Contains("display_name:")) "agents/openai.yaml missing display_name"
Assert-True ($openaiYaml.Contains("short_description:")) "agents/openai.yaml missing short_description"
Assert-True ($openaiYaml.Contains("default_prompt:")) "agents/openai.yaml missing default_prompt"
Assert-True ($openaiYaml.Contains("Orchestrate multi-agent UI implementation")) "agents/openai.yaml should include English description"
Assert-True ($openaiYaml.Contains("&#")) "agents/openai.yaml should include Chinese rendered through HTML entities"
Assert-True ($openaiYaml.Contains("@phosphor-icons/react")) "agents/openai.yaml should mention approved icon libraries"
Assert-True ($openaiYaml.Contains("hugeicons-react")) "agents/openai.yaml should mention approved icon libraries"
Assert-True ($openaiYaml.Contains("@radix-ui/react-icons")) "agents/openai.yaml should mention approved icon libraries"
Assert-True ($openaiYaml.Contains("@tabler/icons-react")) "agents/openai.yaml should mention approved icon libraries"
Assert-True ($openaiYaml.Contains("multi-agent")) "agents/openai.yaml should mention multi-agent orchestration"
Assert-True ($openaiYaml.Contains("backend-contract")) "agents/openai.yaml should mention the backend contract role"
Assert-True ($openaiYaml.Contains("state-machine")) "agents/openai.yaml should mention the state machine role"
Assert-True ($openaiYaml.Contains("accessibility")) "agents/openai.yaml should mention the accessibility role"
Assert-True ($openaiYaml.Contains("release")) "agents/openai.yaml should mention the release role"

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
