# Project Rules - Database Synchronization

To prevent losing modifications made by the user in the live admin control panel on Render (due to Render's ephemeral container filesystem), you MUST follow this protocol:

1. **Before pushing any code updates to GitHub:**
   * Always run `node pull_live_db.js` from the backend directory (`c:\Users\Nitro i5-7300HQ\Downloads\العاب`) first.
   * This downloads the latest `db.json` from the live server and updates the local repository database.
   * Commit the updated `db.json` along with your code changes.

2. **Before building the APK:**
   * Run `node pull_live_db.js` to get the latest settings, games, and banners.
   * Run `node bake_db_to_app.js` in the Flutter directory to bake these latest configurations into the offline fallback app code.
