@echo off
echo Cleaning up files that cause Cursor lag...

if exist ".next" (
    rmdir /s /q ".next"
    echo Removed .next directory
)

if exist "tsconfig.tsbuildinfo" (
    del "tsconfig.tsbuildinfo"
    echo Removed tsconfig.tsbuildinfo
)

if exist "SDK_CRAWLER_STATISTICS_0.json" (
    del "SDK_CRAWLER_STATISTICS_0.json"
    echo Removed SDK_CRAWLER_STATISTICS_0.json
)

if exist "instagram-posts-upload.json" (
    del "instagram-posts-upload.json"
    echo Removed instagram-posts-upload.json
)

if exist "instagram-posts-cleaned.xlsx" (
    del "instagram-posts-cleaned.xlsx"
    echo Removed instagram-posts-cleaned.xlsx
)

if exist "dataset_instagram-scraper_2025-07-24_15-01-56-173.xlsx" (
    del "dataset_instagram-scraper_2025-07-24_15-01-56-173.xlsx"
    echo Removed dataset_instagram-scraper_2025-07-24_15-01-56-173.xlsx
)

if exist "generated-posts.json" (
    del "generated-posts.json"
    echo Removed generated-posts.json
)

if exist "template-150-posts.json" (
    del "template-150-posts.json"
    echo Removed template-150-posts.json
)

if exist "sample-posts.json" (
    del "sample-posts.json"
    echo Removed sample-posts.json
)

echo.
echo Cleanup complete! Cursor should be much faster now.
echo.
echo Tips to keep Cursor fast:
echo   - Keep large data files in a separate data/ folder
echo   - Use .gitignore to exclude build artifacts
echo   - Regularly run this cleanup script
echo   - Consider using .cursorignore for Cursor-specific exclusions
pause

