# 0.11.4
- If a cookie exists, login the user automatically
- Fixed several issues related to update conflicts:
-- Cloning a tiddler (was trying to create a new document with an existing revision)
-- Renaming a tiddler
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