import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = resolve(rootDir, "frontend");
const publicDir = resolve(frontendDir, "public");
const appDir = resolve(frontendDir, "app");

mkdirSync(publicDir, { recursive: true });
mkdirSync(appDir, { recursive: true });

const logoMarkSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pdf-mark-bg" x1="88" y1="76" x2="420" y2="438" gradientUnits="userSpaceOnUse">
      <stop stop-color="#022C22" />
      <stop offset="1" stop-color="#065F46" />
    </linearGradient>
  </defs>
  <rect x="32" y="32" width="448" height="448" rx="128" fill="url(#pdf-mark-bg)" />
  <rect x="122" y="88" width="238" height="336" rx="58" fill="#FFFFFF" />
  <path d="M278 88L360 170V226H278V88Z" fill="#D1FAE5" />
  <path d="M170 154H222V358H170V154Z" fill="#047857" />
  <path d="M222 154H244C313.624 154 370 201.905 370 260C370 318.095 313.624 366 244 366H222V322H242C282.317 322 315 294.242 315 260C315 225.758 282.317 198 242 198H222V154Z" fill="#10B981" />
  <path d="M286 218L356 260L286 302V218Z" fill="#6EE7B7" />
</svg>
`;

const logoSvg = `<svg width="920" height="220" viewBox="0 0 920 220" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pdf-logo-bg" x1="88" y1="76" x2="420" y2="438" gradientUnits="userSpaceOnUse">
      <stop stop-color="#022C22" />
      <stop offset="1" stop-color="#065F46" />
    </linearGradient>
  </defs>
  <g transform="translate(12 18) scale(0.359375)">
    <rect x="32" y="32" width="448" height="448" rx="128" fill="url(#pdf-logo-bg)" />
    <rect x="122" y="88" width="238" height="336" rx="58" fill="#FFFFFF" />
    <path d="M278 88L360 170V226H278V88Z" fill="#D1FAE5" />
    <path d="M170 154H222V358H170V154Z" fill="#047857" />
    <path d="M222 154H244C313.624 154 370 201.905 370 260C370 318.095 313.624 366 244 366H222V322H242C282.317 322 315 294.242 315 260C315 225.758 282.317 198 242 198H222V154Z" fill="#10B981" />
    <path d="M286 218L356 260L286 302V218Z" fill="#6EE7B7" />
  </g>
  <text
    x="208"
    y="102"
    fill="#18181B"
    font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="72"
    font-weight="800"
    letter-spacing="-2.2"
  >
    <tspan fill="#059669">PDF</tspan><tspan fill="#18181B">Tools</tspan>
  </text>
  <text
    x="210"
    y="146"
    fill="#71717A"
    font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="24"
    font-weight="500"
    letter-spacing="-0.3"
  >
    by WellFriend
  </text>
</svg>
`;

writeFileSync(resolve(publicDir, "logo-mark.svg"), logoMarkSvg, "utf8");
writeFileSync(resolve(publicDir, "logo.svg"), logoSvg, "utf8");

const psLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;
const tempScriptPath = join(tmpdir(), `pdftools-logo-assets-${Date.now()}.ps1`);

const powerShellScript = `
Add-Type -AssemblyName System.Drawing

function New-RoundedPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-SolidBrush([string]$hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Draw-Mark([System.Drawing.Graphics]$graphics, [float]$size, [float]$originX, [float]$originY) {
  $scale = $size / 512.0
  $backgroundPath = New-RoundedPath ($originX + 32 * $scale) ($originY + 32 * $scale) (448 * $scale) (448 * $scale) (128 * $scale)
  $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new($originX + 88 * $scale, $originY + 76 * $scale),
    [System.Drawing.PointF]::new($originX + 420 * $scale, $originY + 438 * $scale),
    [System.Drawing.ColorTranslator]::FromHtml('#022C22'),
    [System.Drawing.ColorTranslator]::FromHtml('#065F46')
  )
  $graphics.FillPath($backgroundBrush, $backgroundPath)

  $paperPath = New-RoundedPath ($originX + 122 * $scale) ($originY + 88 * $scale) (238 * $scale) (336 * $scale) (58 * $scale)
  $graphics.FillPath((New-SolidBrush '#FFFFFF'), $paperPath)

  $foldPoints = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($originX + 278 * $scale, $originY + 88 * $scale),
    [System.Drawing.PointF]::new($originX + 360 * $scale, $originY + 170 * $scale),
    [System.Drawing.PointF]::new($originX + 360 * $scale, $originY + 226 * $scale),
    [System.Drawing.PointF]::new($originX + 278 * $scale, $originY + 226 * $scale)
  )
  $graphics.FillPolygon((New-SolidBrush '#D1FAE5'), $foldPoints)

  $graphics.FillRectangle((New-SolidBrush '#047857'), $originX + 170 * $scale, $originY + 154 * $scale, 52 * $scale, 204 * $scale)

  $pPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $pPath.StartFigure()
  $pPath.AddLine($originX + 222 * $scale, $originY + 154 * $scale, $originX + 244 * $scale, $originY + 154 * $scale)
  $pPath.AddBezier(
    $originX + 244 * $scale, $originY + 154 * $scale,
    $originX + 322 * $scale, $originY + 154 * $scale,
    $originX + 370 * $scale, $originY + 204 * $scale,
    $originX + 370 * $scale, $originY + 260 * $scale
  )
  $pPath.AddBezier(
    $originX + 370 * $scale, $originY + 260 * $scale,
    $originX + 370 * $scale, $originY + 316 * $scale,
    $originX + 322 * $scale, $originY + 366 * $scale,
    $originX + 244 * $scale, $originY + 366 * $scale
  )
  $pPath.AddLine($originX + 244 * $scale, $originY + 366 * $scale, $originX + 222 * $scale, $originY + 366 * $scale)
  $pPath.AddLine($originX + 222 * $scale, $originY + 366 * $scale, $originX + 222 * $scale, $originY + 322 * $scale)
  $pPath.AddLine($originX + 222 * $scale, $originY + 322 * $scale, $originX + 242 * $scale, $originY + 322 * $scale)
  $pPath.AddBezier(
    $originX + 242 * $scale, $originY + 322 * $scale,
    $originX + 286 * $scale, $originY + 322 * $scale,
    $originX + 315 * $scale, $originY + 294 * $scale,
    $originX + 315 * $scale, $originY + 260 * $scale
  )
  $pPath.AddBezier(
    $originX + 315 * $scale, $originY + 260 * $scale,
    $originX + 315 * $scale, $originY + 226 * $scale,
    $originX + 286 * $scale, $originY + 198 * $scale,
    $originX + 242 * $scale, $originY + 198 * $scale
  )
  $pPath.AddLine($originX + 242 * $scale, $originY + 198 * $scale, $originX + 222 * $scale, $originY + 198 * $scale)
  $pPath.CloseFigure()
  $graphics.FillPath((New-SolidBrush '#10B981'), $pPath)

  $arrowPoints = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($originX + 286 * $scale, $originY + 218 * $scale),
    [System.Drawing.PointF]::new($originX + 356 * $scale, $originY + 260 * $scale),
    [System.Drawing.PointF]::new($originX + 286 * $scale, $originY + 302 * $scale)
  )
  $graphics.FillPolygon((New-SolidBrush '#6EE7B7'), $arrowPoints)

  $backgroundBrush.Dispose()
  $backgroundPath.Dispose()
  $paperPath.Dispose()
  $pPath.Dispose()
}

function New-FontObject([float]$size, [System.Drawing.FontStyle]$style) {
  try {
    return New-Object System.Drawing.Font('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  } catch {
    return New-Object System.Drawing.Font([System.Drawing.FontFamily]::GenericSansSerif, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  }
}

function Save-SquareAsset([string]$path, [int]$size) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)
  Draw-Mark $graphics $size 0 0
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Save-HorizontalAsset([string]$path, [int]$width, [int]$height) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)

  Draw-Mark $graphics 168 20 26

  $pdfBrush = New-SolidBrush '#059669'
  $toolsBrush = New-SolidBrush '#18181B'
  $subBrush = New-SolidBrush '#71717A'
  $mainFont = New-FontObject 86 ([System.Drawing.FontStyle]::Bold)
  $subFont = New-FontObject 28 ([System.Drawing.FontStyle]::Regular)

  $graphics.DrawString('PDF', $mainFont, $pdfBrush, 220, 42)
  $pdfWidth = $graphics.MeasureString('PDF', $mainFont).Width
  $graphics.DrawString('Tools', $mainFont, $toolsBrush, 220 + $pdfWidth - 8, 42)
  $graphics.DrawString('by WellFriend', $subFont, $subBrush, 224, 140)

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $pdfBrush.Dispose()
  $toolsBrush.Dispose()
  $subBrush.Dispose()
  $mainFont.Dispose()
  $subFont.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$logoPng = ${psLiteral(resolve(publicDir, "logo.png"))}
$logoMarkPng = ${psLiteral(resolve(publicDir, "logo-mark.png"))}
$iconPng = ${psLiteral(resolve(appDir, "icon.png"))}
$appleTouch = ${psLiteral(resolve(publicDir, "apple-touch-icon.png"))}
$favicon32 = ${psLiteral(resolve(publicDir, "favicon-32x32.png"))}
$favicon16 = ${psLiteral(resolve(publicDir, "favicon-16x16.png"))}

Save-HorizontalAsset $logoPng 1024 256
Save-SquareAsset $logoMarkPng 512
Save-SquareAsset $iconPng 512
Save-SquareAsset $appleTouch 180
Save-SquareAsset $favicon32 32
Save-SquareAsset $favicon16 16
`;

writeFileSync(tempScriptPath, powerShellScript, "utf8");

try {
  execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScriptPath], {
    stdio: "inherit",
  });
} finally {
  try {
    unlinkSync(tempScriptPath);
  } catch {
    // ignore cleanup failure
  }
}

console.log("Logo assets generated.");
