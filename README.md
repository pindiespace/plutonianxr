Plutonianxr-Babylon
=============================

Demo of WebXR capabilities using BabylonJS engine
--------------------------------------------------

Introduction
-------------
Plutonianxr is a demo app showing the use of the BabylonJS engine for WebXR (VR and AR) functions

Installing and Running
----------------------

[Updating npm] (https://www.carlrippon.com/upgrading-npm-dependencies/)

Since everything is moving to HTTPS, this project installs a dummy cert and certificate so that the server can run in HTTPS.

To install on Windows, you should use Chocolately, and run PowerShell as an administrator. The easiest way to to search for PowerShell in the windows search, then select "run as administrator."
[Run PowerShell as Admin] (https://www.danielengberg.com/how-to-run-powershell-as-an-administrator/)

[Installing Chocolatey on Windows] (https://chocolatey.org/install)

[Installing OpenSSL on Windows] (https://adamtheautomator.com/openssl-powershell/)

Edit the PowerShell profile to include path via: notepad $PROFILE

Here's the PowerShell profile file...
**********************************************************************
Set-Location "C:\Users\Pete Markiewicz\Documents\websites"
# Chocolatey profile
$ChocolateyProfile = "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
if (Test-Path($ChocolateyProfile)) {
  Import-Module "$ChocolateyProfile"
}

# Add environment variables to PowerShell profile

# Test for a profile, if not found create one!
if (-not (Test-Path $profile) ) {
    New-Item -Path $profile -ItemType File -Force
}

# Edit profile to add these lines
'$env:path = "$env:path;C:\ProgramFiles\OpenSSL\bin"' | Out-File $profile -Append
'$env:OPPENSSL_CONF = "C:\certs\openssl.cnf"' | Out-File $profile -Append
***********************************************************************

Making the CSR
openssl genrsa -out ssl-key.pem 2048

$ openssl req -new -key ssl-key.pem -out certrequest.csr //bunch of prompts

$ openssl x509 -req -in certrequest.csr -signkey ssl-key.pem -out ssl-cert.pem

When making the csr, navigate to the certs directory. The prebuilt csr uses 'plutonian' as its pass.


[Writing tests] (https://medium.com/@svsh227/write-your-first-test-case-in-your-node-app-using-mocha-5250e614feb3)

npm start
npm startdev
npm startserver
npm tests

