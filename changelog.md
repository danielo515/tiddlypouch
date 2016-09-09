# 0.14.3
- Deletions are now synced
- Added a Logger module
  - Allows to control the verbosity level
    - Log: normal information
    - Debug: Only if debug mode is active
    - Trace: only if verbose mode is active
# 0.14.2
- Implemented class for single individual databases configuration
- DefaultTiddlers is loaded at startup along with StoryList
- Sync adaptor method get-skinny-tiddlers now supports both promise flow and callbacks
- Dowload saver that downloads all the tiddlers contained on the current db as JSON
# 0.14.1
- Revisions are validated before saving 
# 0.14
- First version of module loader
# 0.13
- Better ui for revision handling
  - See revisions as tabs of the current tiddler
  - Open several previous revisions to check them all
  - Revisions names are shorted for readability
 - pixel perfect revisions tabs
# 0.12.1
- Set the database name as subtitle
  - Click on it to open the control panel on the database selection tab
- Fixed navigate to tab to display plain text inside the link (avoid wikification)
# 0.12
- Basic revision handling
  - Get **all** revisions of a tiddler method
  - Get revision of a tiddler
  - Ui to show and reload revisions of a tiddler
# 0.11.4
- If a cookie exists, login the user automatically
- Fixed several issues related to update conflicts:
  - Cloning a tiddler (was trying to create a new document with an existing revision)
  - Renaming a tiddler
- Introduced upsert method (which allowed to solve above issues)
# 0.11.3
- More meaningful login message
# 0.11.2
- Plugin deactivation detection mechanism has been removed
-- It was obsolete. Instead we are now using the default tiddlywiki method for the home page
# 0.11.1
- Update ui when a different Database is selected
- Started to move selected database logic to a separate module
- Utils moved to a module
# 0.11
- Updates to UX when saving config
-- On config update user is asked to reload the window
-- Better ui to select one of the existing databases
-- Macro to navigate directly to config tab
-- Button tiddler to save Database config
-- Clearer Getting started tid
- Removed old control panel `server`
- Check if there is URL configured before check login status
- Fixed promise chaining on config init