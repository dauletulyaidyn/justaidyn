# Rename banners: by meaning + display order
# Order: 01-06 course intro, 07-11 projects, 12-25 audience

$map = @{
    # Course identity & differentiators (01-06)
    'banner_ru_slogan'      = '01_slogan_ru'
    'banner_kk_slogan'      = '01_slogan_kk'
    'banner_ru_notchat'     = '02_ai_ne_chat_ru'
    'banner_kk_notchat'     = '02_ai_ne_chat_kk'
    'banner_ru_nomagic'     = '03_bez_magii_ru'
    'banner_kk_nomagic'     = '03_bez_magii_kk'
    'banner_ru_level'       = '04_uroven_ru'
    'banner_kk_level'       = '04_uroven_kk'
    'banner_kk_modules'     = '05_moduli_ru'      # RU version (was misnamed)
    'banner_kk_modules (1)' = '05_moduli_kk'
    'banner_ru_topics'      = '06_temy_ru'
    'banner_kk_topics'      = '06_temy_kk'
    # Projects (07-11)
    'banner_ru_project1' = '07_project1_profile_ru'
    'banner_kk_project1' = '07_project1_profile_kk'
    'banner_ru_project2' = '08_project2_taskmanager_ru'
    'banner_kk_project2' = '08_project2_taskmanager_kk'
    'banner_ru_project3' = '09_project3_reshenie_ru'
    'banner_kk_project3' = '09_project3_reshenie_kk'
    'banner_ru_project4' = '10_project4_avtomatizaciya_ru'
    'banner_kk_project4' = '10_project4_avtomatizaciya_kk'
    'banner_ru_project5' = '11_project5_issledovanie_ru'
    'banner_kk_project5' = '11_project5_issledovanie_kk'
    # Audience (12-25)
    'I1 Main ru'     = '12_dlya_vseh_ru'
    'I Main KK'      = '12_dlya_vseh_kk'
    'II1 Scientist ru' = '13_uchenyj_ru'
    'II Scientist KK'  = '13_uchenyj_kk'
    'III1 Teacher ru' = '14_pedagog_ru'
    'III Teacher KK'   = '14_pedagog_kk'
    'IV1 Businessman ru' = '15_biznesmen_ru'
    'IV Businessman KK'  = '15_biznesmen_kk'
    'V1 Marketolog ru' = '16_marketolog_ru'
    'V Marketolog KK'   = '16_marketolog_kk'
    'VI1 Header ru'    = '17_rukovoditel_ru'
    'VI Header KK'     = '17_rukovoditel_kk'
    'VII1 Job seeker ru' = '18_soiskatel_ru'
    'VII Job seeker KK'  = '18_soiskatel_kk'
    'VIII1 Pupil ru'   = '19_student_ru'
    'VIII Pupil KK'    = '19_student_kk'
    'IX1 Parents ru'   = '20_roditeli_ru'
    'IX Parents KK'    = '20_roditeli_kk'
    'X1 Creative maker ru' = '21_tvorets_ru'
    'X Creative maker KK'  = '21_tvorets_kk'
    'Development ru'   = '22_razrabotchik_ru'
    'Development KK'   = '22_razrabotchik_kk'
    'Personal ru '     = '23_lichnyj_brend_ru'
    'Personal KK'      = '23_lichnyj_brend_kk'
    'Research ru'      = '24_issledovatel_ru'
    'Research KK'      = '24_issledovatel_kk'
    'Work ru'          = '25_rabota_ru'
    'Work KK'          = '25_rabota_kk'
}

$bannersDir = (Resolve-Path (Join-Path $PSScriptRoot '..\Banners')).Path
$renamed = 0

foreach ($key in $map.Keys | Sort-Object) {
    $newBase = $map[$key]
    foreach ($ext in @('.html', '.png')) {
        $oldName = $key + $ext
        $newName = $newBase + $ext
        $oldPath = Join-Path $bannersDir $oldName
        $newPath = Join-Path $bannersDir $newName
        if (Test-Path $oldPath) {
            if (Test-Path $newPath) { Remove-Item $newPath -Force }
            Rename-Item -Path $oldPath -NewName $newName
            Write-Host "OK: $oldName -> $newName"
            $renamed++
        }
    }
}

Write-Host "`nRenamed $renamed files."
