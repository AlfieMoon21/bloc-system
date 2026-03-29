# Design decisions

## Session first
#### Decision
**Users must create a session before logging climbs. multibe climbs an be added to the same session.*
#### Rational
+ Reflects real-world climbing behaviour (one gym visit = one session, multiple climbs)
+ Prevents duplicate session data entry
+ Allows session-level statistics (total climbs per visit, session duration)
+ Database schema already supports this with foreign key relationship
#### impact 
+ Need two-step user flow: Create session → Add climb(s) to that session
+ Need session selection mechanism when logging climbs
+ SSession detail page needed to view all climbs in session



## Template variable error handaling
#### Decision
*Use template variables((res.render) with error object) instead of URL parameters for error messages.*
#### Rational
+ Security: Errors not exposed in browser URL bar or history
+ User experience: Cleaner URLs
+ Privacy: Prevents error messages from being shared via URL
+ Consistency: Aligns with Handlebars templating approach
#### impact
+ All error handling must use res.render not res.redirect with query params
+ Templates need error display blocks
+ Form data must be preserved and re-rendered on error (user doesn't lose input)



## Optional Image Upload
#### Decision
*Climb photos remain optional (nullable database field).*
#### Rational
+ Flexibility: Not all climbers photograph every attempt
+ Accessibility: Users in gyms with photography restrictions can still participate
+ Performance: Reduces storage requirements
+ User experience: Lowers barrier to entry for quick logging
#### impact
+ Database schema already supports (image_path nullable)
+ Display logic must handle missing images
+ Form validation must not require image



## Timer based duration
#### Decision
*sessions are automatically timer based duration tracking. User starts a session, log climbs during it , then end the session*
#### Rational 
+ Matches gym app model (start session → log climbs → end session)
+ More accurate than manual estimation
+ Better user experience (automated tracking)
+ Enables active sessions
+ Prevents confusion about session timing
#### Impact 
+ Database schema modification required: add start_time and end_time DATETIME fields
+ Remove or make nullable the duration INTEGER field (calculated instead of stored)
+ Session states: active (in progress), completed (ended)
+ Duration calculated as end_time - start_time when displaying
+ Only one active session allowed per user at a time
+ "Start Session" action creates session with start_time = NOW()
+ "End Session" action updates session with end_time = NOW()



## Single active session
#### Decision
*Users can only have one active session at a time. Must end current session before starting a new one.*
#### Rational
+ Reflects physical reality (can't be at two gyms simultaneously)
+ Simplifies data integrity (no orphaned active sessions)
+ Clearer user mental model
+ Prevents accidental duplicate sessions
#### Impact
+ Before creating new session, check if user has active session (end_time IS NULL)
+ If active session exists, redirect to that session instead
+ Session detail page needs "End Session" button
+ Homepage/nav should show "Resume Session" if active session exists instead of "Start New Session"



## Navigation State
#### Decision
*Navigation shows "Sessions" link. When user has an active session, link text changes to "Active Session" and leads directly to that session.*
#### Rationale
+ Clear indication of session state
+ Quick access to current session for logging climbs
+ Prevents confusion about where to log climbs
+ Single entry point for session management
#### Impact
+ Navigation needs conditional logic based on active session existence
+ Requires database query in user middleware to check for active session
+ Template needs access to activeSession variable
+ Route logic: if active session exists, go to session detail; if not, go to session list/create page

## Instagram-Style Session FeedDecision
### decision
*Homepage displays session cards (not individual climbs). Each session card shows: date, gym name, session description, photo collage of climbs, and username. Clicking a session opens detailed view with all individual climbs scrollable.Rationale*

* Better UX: Sessions are the natural grouping unit (one gym visit = one post)
* Visual appeal: Photo collages more engaging than single climb images
* Context: Seeing the whole session gives better understanding of user's climbing day
* Social media familiarity: Instagram-style feed is intuitive for users
* Performance: Fewer database queries (load sessions, not every individual climb)
* Scalability: Prevents homepage from being overwhelmed with individual climb entries
* Implementation Impact

* Homepage queries sessions (with user and climb count), not individual climbs
* Session cards need climb photo aggregation (get all images for collage)
* Session detail page displays scrollable list of climbs with full information
* Database query joins: sessions → users, sessions → climbs (count/images)
* Click handler on session cards routes to /session/:id detail page
* Photo collage logic: display first 4 climb images in grid, show "+X more" if more exist