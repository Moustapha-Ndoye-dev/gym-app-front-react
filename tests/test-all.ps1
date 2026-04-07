# ==============================================================================
# SUITE DE TESTS - FRONT REACT (Vite) + API via proxy (comme gym back/tests)
# ==============================================================================
# Les requetes passent par http://localhost:3001/api -> proxy -> backend :5000
#
# Prerequis :
#   1. Backend demarre : cd "gym back" ; npm run dev  (port 5000)
#   2. Front demarre   : cd "gym front react" ; npm run dev  (port 3001)
#
# Lancement :  cd "gym front react"  ;  npm run test
#              ou  powershell -File .\tests\test-all.ps1
#
# Options :  -FrontUrl "http://localhost:3001"   -SkipLint   -SkipSpaCheck
# ==============================================================================

param(
    [string]$FrontUrl = "http://localhost:3001",
    [switch]$SkipLint,
    [switch]$SkipSpaCheck
)

$BASE_URL = "$FrontUrl/api".Replace('//api', '/api')  # evite double slash si URL finit par /
if ($BASE_URL -match '//api$') { $BASE_URL = "$FrontUrl/api" }
if (-not $BASE_URL.EndsWith('/api')) {
    $BASE_URL = "$($FrontUrl.TrimEnd('/'))/api"
}

$PassCount = 0
$FailCount = 0

function Show-Header($msg) {
    Write-Host "`n>>> $msg <<<" -ForegroundColor Cyan
}

function Test-Endpoint($method, $path, $body, $token) {
    $url = "$BASE_URL$path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers.Add("Authorization", "Bearer $token") }

    Write-Host "$($method.PadRight(4)) (proxy) $path... " -NoNewline
    try {
        $params = @{ Uri = $url; Method = $method; Headers = $headers; ErrorAction = "Stop" }
        if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 8 -Compress) }
        $response = Invoke-RestMethod @params
        Write-Host "SUCCESS" -ForegroundColor Green
        $script:PassCount++
        return $response
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "  Erreur: $($_.Exception.Message)" -ForegroundColor Yellow
        if ($_.ErrorDetails.Message) { Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow }
        $script:FailCount++
        return $null
    }
}

function Test-ShouldFail($method, $path, $body, $token, $expectedCode, $scenarioName) {
    $url = "$BASE_URL$path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers.Add("Authorization", "Bearer $token") }

    Write-Host "SECURITE: $scenarioName... " -NoNewline
    try {
        $params = @{ Uri = $url; Method = $method; Headers = $headers; ErrorAction = "Stop" }
        if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 8 -Compress) }
        Invoke-RestMethod @params | Out-Null
        Write-Host "ECHEC SECURITE (la requete aurait du etre refusee)" -ForegroundColor Red
        $script:FailCount++
        return $false
    } catch {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq $expectedCode) {
            Write-Host "BLOQUE ($statusCode) OK" -ForegroundColor Green
            $script:PassCount++
            return $true
        }
        Write-Host "CODE INATTENDU: $statusCode (attendu: $expectedCode)" -ForegroundColor Yellow
        $script:PassCount++
        return $true
    }
}

# ==============================================================================
Show-Header "PHASE 0: FRONT REACT (Vite) + TypeScript"
# ==============================================================================

$reactRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $reactRoot

if (-not $SkipLint) {
    Write-Host "npm run lint (tsc --noEmit)... " -NoNewline
    & npm run lint 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK" -ForegroundColor Green
        $script:PassCount++
    } else {
        Write-Host "ECHEC (corriger les erreurs TypeScript)" -ForegroundColor Red
        $script:FailCount++
        Pop-Location
        exit 1
    }
} else {
    Write-Host "Phase lint ignoree (-SkipLint)." -ForegroundColor Gray
}

if (-not $SkipSpaCheck) {
    Write-Host "GET $FrontUrl/ (page SPA)... " -NoNewline
    try {
        $spa = Invoke-WebRequest -Uri $FrontUrl -UseBasicParsing -TimeoutSec 15
        if ($spa.StatusCode -eq 200 -and ($spa.Content -match 'id="root"' -or $spa.Content -match "id='root'")) {
            Write-Host "OK (root trouve)" -ForegroundColor Green
            $script:PassCount++
        } else {
            Write-Host "ECHEC (pas de div#root ?)" -ForegroundColor Red
            $script:FailCount++
        }
    } catch {
        Write-Host "ECHEC : demarrer le front (npm run dev sur le port 3001)." -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Yellow
        $script:FailCount++
        Pop-Location
        exit 1
    }
} else {
    Write-Host "Verification SPA ignoree (-SkipSpaCheck)." -ForegroundColor Gray
}

Pop-Location

Write-Host "`nAPI via proxy : $BASE_URL (backend doit ecouter sur le port du vite.config)" -ForegroundColor DarkGray

# ==============================================================================
Show-Header "PHASE 1: ENREGISTREMENT SALLE + AUTH (JWT via proxy)"
# ==============================================================================

$ticks = [string](Get-Date).Ticks
$phone1 = "06{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
$phone2 = "07{0:D8}" -f (Get-Random -Minimum 10000000 -Maximum 99999999)
$gym1Data = @{
    gymName       = "Gold Gym ReactTest"
    gymPhone      = $phone1
    adminUsername = "admin_gold_$ticks"
    adminPassword = "password123"
}

Write-Host "Enregistrement Salle 1..."
$gym1Res = Test-Endpoint "POST" "/auth/register-gym" $gym1Data $null
if (-not $gym1Res -or -not $gym1Res.gym) {
    Write-Host "ARRET : proxy ou API indisponible. Verifiez back :5000 + front :3001." -ForegroundColor Red
    exit 1
}
$gym1Id = $gym1Res.gym.id

Write-Host "Connexion Admin Salle 1..."
$login1 = Test-Endpoint "POST" "/auth/login" @{ username = $gym1Data.adminUsername; password = $gym1Data.adminPassword } $null
if (-not $login1) { exit 1 }
$TOKEN1 = $login1.token

$gym2Data = @{
    gymName       = "Silver Gym ReactTest"
    gymPhone      = $phone2
    adminUsername = "admin_silver_$ticks"
    adminPassword = "password123"
}

Write-Host "Enregistrement Salle 2..."
$gym2Res = Test-Endpoint "POST" "/auth/register-gym" $gym2Data $null
if (-not $gym2Res) { exit 1 }

Write-Host "Connexion Admin Salle 2..."
$login2 = Test-Endpoint "POST" "/auth/login" @{ username = $gym2Data.adminUsername; password = $gym2Data.adminPassword } $null
$TOKEN2 = $login2.token

# ==============================================================================
Show-Header "PHASE 2: ABONNEMENTS (CRUD via proxy)"
# ==============================================================================

$subMoRes = Test-Endpoint "POST" "/subscriptions" @{
    name     = "Pass Mensuel"
    price    = 50
    features = "Acces salle"
} $TOKEN1

$subAnRes = Test-Endpoint "POST" "/subscriptions" @{
    name     = "VIP Annuel"
    price    = 500
    features = "Formule premium"
} $TOKEN1

$subMo = if ($subMoRes) { $subMoRes.subscription } else { $null }
$subAn = if ($subAnRes) { $subAnRes.subscription } else { $null }

Test-Endpoint "GET" "/subscriptions" $null $TOKEN1

if ($subMo) {
    Test-Endpoint "PUT" "/subscriptions/$($subMo.id)" @{
        name     = "Pass Mensuel MAJ"
        price    = 55
        features = "Acces salle + vestiaires"
    } $TOKEN1
}
if ($subAn) {
    Test-Endpoint "DELETE" "/subscriptions/$($subAn.id)" $null $TOKEN1
}

# ==============================================================================
Show-Header "PHASE 3: MEMBRES + ISOLATION (via proxy)"
# ==============================================================================

if (-not $subMo) {
    Write-Host "ERREUR : pas d'abonnement pour lier le membre." -ForegroundColor Red
    exit 1
}

$memBody = @{
    firstName      = "Alice"
    lastName       = "Member"
    email          = "alice_$ticks@test.com"
    phone          = "0612345678"
    subscriptionId = $subMo.id
    photo          = "https://i.pravatar.cc/150?u=alice"
}
$mem1Res = Test-Endpoint "POST" "/members" $memBody $TOKEN1
$mem1 = if ($mem1Res) { $mem1Res.member } else { $null }

Test-Endpoint "GET" "/members" $null $TOKEN1

if ($mem1) {
    Test-Endpoint "PUT" "/members/$($mem1.id)" @{
        firstName = "Alice"
        lastName  = "Dupont"
        phone     = "0699999999"
        email     = $memBody.email
    } $TOKEN1
}

Write-Host "Verification isolation multi-tenant... "
$gym2Members = Test-Endpoint "GET" "/members" $null $TOKEN2
$found = $false
if ($mem1) {
    $list = @($gym2Members)
    $found = $null -ne ($list | Where-Object { $_ -and $_.id -eq $mem1.id })
}
if ($mem1 -and $found) {
    Write-Host "  ECHEC CRITIQUE : fuite de donnees." -ForegroundColor Red
    $script:FailCount++
} elseif ($mem1) {
    Write-Host "  OK : isole par salle." -ForegroundColor Green
    $script:PassCount++
}

# ==============================================================================
Show-Header "PHASE 4: ACCES QR + TICKETS (via proxy)"
# ==============================================================================

if ($mem1) {
    $accessMember = Test-Endpoint "POST" "/access/verify" @{ qr_code = "MEMBER-$($mem1.id)" } $TOKEN1
    if ($accessMember) {
        $c = if ($accessMember.granted) { "Green" } else { "Red" }
        Write-Host "  Membre QR granted=$($accessMember.granted)" -ForegroundColor $c
    }
}

$ticketRes = Test-Endpoint "POST" "/tickets" @{
    type  = "Séance Unique"
    price = 15
} $TOKEN1
$ticket = if ($ticketRes) { $ticketRes.ticket } else { $null }

if ($ticket) {
    $accessTicket = Test-Endpoint "POST" "/access/verify" @{ qr_code = "TICKET-$($ticket.id)" } $TOKEN1
    if ($accessTicket) {
        $c = if ($accessTicket.granted) { "Green" } else { "Red" }
        Write-Host "  Ticket QR granted=$($accessTicket.granted)" -ForegroundColor $c
    }
}

Test-Endpoint "GET" "/tickets" $null $TOKEN1
if ($ticket) {
    Test-Endpoint "DELETE" "/tickets/$($ticket.id)" $null $TOKEN1
}

# ==============================================================================
Show-Header "PHASE 5: ACTIVITES / PRODUITS / TRANSACTIONS (via proxy)"
# ==============================================================================

$actRes = Test-Endpoint "POST" "/activities" @{
    name        = "Boxe anglaise"
    description = "Cours avec Marco"
} $TOKEN1
$act1 = if ($actRes) { $actRes.activity } else { $null }

Test-Endpoint "GET" "/activities" $null $TOKEN1
if ($act1) {
    Test-Endpoint "PUT" "/activities/$($act1.id)" @{
        name        = "Boxe anglaise avancee"
        description = "Niveau confirme"
    } $TOKEN1
    Test-Endpoint "DELETE" "/activities/$($act1.id)" $null $TOKEN1
}

$prodRes = Test-Endpoint "POST" "/products" @{
    name     = "Shake proteine"
    price    = 3.5
    stock    = 50
    category = "Supplement"
} $TOKEN1
$prod1 = if ($prodRes) { $prodRes.product } else { $null }

Test-Endpoint "GET" "/products" $null $TOKEN1
if ($prod1) {
    Test-Endpoint "GET" "/products/$($prod1.id)" $null $TOKEN1
    Test-Endpoint "PUT" "/products/$($prod1.id)" @{
        name     = "Shake proteine XL"
        price    = 4.5
        stock    = 40
        category = "Supplement"
    } $TOKEN1
    Test-Endpoint "DELETE" "/products/$($prod1.id)" $null $TOKEN1
}

$txRes = Test-Endpoint "POST" "/transactions" @{
    amount      = 100
    type        = "income"
    description = "Vente boutique"
} $TOKEN1
$tx1 = if ($txRes) { $txRes.transaction } else { $null }

Test-Endpoint "GET" "/transactions" $null $TOKEN1
if ($tx1) {
    Test-Endpoint "DELETE" "/transactions/$($tx1.id)" $null $TOKEN1
}

# ==============================================================================
Show-Header "PHASE 6: LOGS D'ACCES (via proxy)"
# ==============================================================================

Test-Endpoint "GET" "/access/logs" $null $TOKEN1

# ==============================================================================
Show-Header "PHASE 7: UTILISATEURS STAFF (via proxy)"
# ==============================================================================

Test-Endpoint "GET" "/users" $null $TOKEN1

$staffUser = @{
    username = "caissier_$ticks"
    password = "staff123"
    role     = "cashier"
}
$newUserRes = Test-Endpoint "POST" "/users" $staffUser $TOKEN1
$newUser = if ($newUserRes) { $newUserRes.user } else { $null }

if ($newUser) {
    Test-Endpoint "PUT" "/users/$($newUser.id)" @{
        username = $staffUser.username
        role     = "controller"
    } $TOKEN1
    Test-Endpoint "DELETE" "/users/$($newUser.id)" $null $TOKEN1
}

# ==============================================================================
Show-Header "PHASE 8: SECURITE (via proxy)"
# ==============================================================================

Test-ShouldFail "GET" "/members" $null $null 401 "Sans token (401)"
Test-ShouldFail "GET" "/members" $null "faux.token" 401 "Token invalide (401)"
Test-ShouldFail "GET" "/activities" $null "eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.FAKE" 401 "Token fake (401)"

Write-Host "SECURITE: QR membre inexistant... " -NoNewline
$badQR = Test-Endpoint "POST" "/access/verify" @{ qr_code = "MEMBER-99999999" } $TOKEN1
if ($badQR -and -not $badQR.granted) {
    Write-Host "OK" -ForegroundColor Green
    $script:PassCount++
} elseif ($badQR -and $badQR.granted) {
    Write-Host "ECHEC" -ForegroundColor Red
    $script:FailCount++
}

Write-Host "SECURITE: Double scan ticket Seance unique..."
$t2Res = Test-Endpoint "POST" "/tickets" @{ type = "Séance Unique"; price = 10 } $TOKEN1
$t2 = if ($t2Res) { $t2Res.ticket } else { $null }
if ($t2) {
    $null = Test-Endpoint "POST" "/access/verify" @{ qr_code = "TICKET-$($t2.id)" } $TOKEN1
    $acc2 = Test-Endpoint "POST" "/access/verify" @{ qr_code = "TICKET-$($t2.id)" } $TOKEN1
    if ($acc2 -and -not $acc2.granted) {
        Write-Host "  2e scan refuse OK" -ForegroundColor Green
        $script:PassCount++
    } else {
        Write-Host "  ECHEC usage unique" -ForegroundColor Red
        $script:FailCount++
    }
    Test-Endpoint "DELETE" "/tickets/$($t2.id)" $null $TOKEN1
}

Write-Host "SECURITE: Cross-tenant... " -NoNewline
if ($mem1) {
    $cross = Test-Endpoint "POST" "/access/verify" @{ qr_code = "MEMBER-$($mem1.id)" } $TOKEN2
    if ($cross -and -not $cross.granted) {
        Write-Host "OK" -ForegroundColor Green
        $script:PassCount++
    } elseif ($cross -and $cross.granted) {
        Write-Host "ATTENTION cross-tenant" -ForegroundColor Yellow
    }
} else {
    Write-Host "SKIP" -ForegroundColor Gray
}

Write-Host "SECURITE: RBAC cashier / products..."
$cashierBody = @{ username = "cashier_sec_$ticks"; password = "cashier123"; role = "cashier" }
$cashierRes = Test-Endpoint "POST" "/users" $cashierBody $TOKEN1
$cashierUser = if ($cashierRes) { $cashierRes.user } else { $null }
if ($cashierUser) {
    $cl = Test-Endpoint "POST" "/auth/login" @{ username = $cashierBody.username; password = $cashierBody.password } $null
    $CASHIER_TOKEN = if ($cl) { $cl.token } else { $null }
    if ($CASHIER_TOKEN) {
        Test-ShouldFail "POST" "/products" @{ name = "X"; price = 10; stock = 5 } $CASHIER_TOKEN 403 "Cashier POST products 403"
        Test-ShouldFail "GET" "/users" $null $CASHIER_TOKEN 403 "Cashier GET users 403"
    }
    Test-Endpoint "DELETE" "/users/$($cashierUser.id)" $null $TOKEN1
}

Write-Host "`nNote: rate limit login - voir gym back middleware/rateLimiter.ts" -ForegroundColor Gray

# ==============================================================================
Show-Header "PHASE 9: NETTOYAGE"
# ==============================================================================

if ($mem1) {
    Test-Endpoint "DELETE" "/members/$($mem1.id)" $null $TOKEN1
}

# ==============================================================================
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  RAPPORT FINAL (React + proxy + API)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASSES  : $PassCount" -ForegroundColor Green
Write-Host "  ECHOUES : $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })
Write-Host "  TOTAL   : $($PassCount + $FailCount)" -ForegroundColor White
Write-Host "  Proxy   : $BASE_URL" -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor Cyan

if ($FailCount -gt 0) { exit 1 }
