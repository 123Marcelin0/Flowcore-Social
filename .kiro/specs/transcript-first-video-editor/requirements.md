# Requirements Document

## Introduction

This feature transforms the video editor neu page into a transcript-first editing interface, replacing the current large video element with a primary transcript editor on the left, and displaying a smaller Instagram-style (9:16) video preview on the right/center. The implementation reuses the existing design system while being inspired by Submagic's clean, minimal interface to become the default standard layout for all new projects.

## Requirements

### Requirement 1

**User Story:** As a content creator, I want a transcript-first editing interface, so that I can edit my videos by directly manipulating the spoken content rather than working with timeline scrubbing.

#### Acceptance Criteria

1. WHEN a user opens the video editor neu page THEN the system SHALL display the transcript editor as the primary, large panel on the left side
2. WHEN a user loads a video THEN the system SHALL automatically generate and display a transcript with timestamps
3. WHEN a user clicks on any word or phrase in the transcript THEN the system SHALL jump the video playback to that exact timestamp
4. WHEN a user edits text in the transcript THEN the system SHALL immediately reflect those changes in the video captions
5. WHEN a user cuts or removes text from the transcript THEN the system SHALL remove the corresponding video segment

### Requirement 2

**User Story:** As a content creator, I want an Instagram-style video preview panel, so that I can see my vertical content in the proper aspect ratio while editing.

#### Acceptance Criteria

1. WHEN the editor loads THEN the system SHALL display a 9:16 vertical video preview in the right/center column
2. WHEN the video plays THEN the system SHALL show captions synced from transcript edits in the preview
3. WHEN a user interacts with video controls THEN the system SHALL provide play, pause, and scrub functionality
4. WHEN editing is in progress THEN the system SHALL show a low-resolution preview for speed
5. WHEN exporting THEN the system SHALL render in high resolution

### Requirement 3

**User Story:** As a content creator, I want the existing toolbar functionality to work seamlessly with transcript editing, so that I can use familiar tools in the new layout.

#### Acceptance Criteria

1. WHEN the editor loads THEN the system SHALL display the current toolbar design from editor neu at the top
2. WHEN a user clicks "Remove Silences" THEN the system SHALL remove silent portions from both transcript and video
3. WHEN a user clicks "Remove Bad Takes" THEN the system SHALL identify and remove poor quality segments from transcript and video
4. WHEN a user applies colors, branding, or audio changes THEN the system SHALL update both transcript captions and video preview
5. WHEN a user uses AI tools THEN the system SHALL apply enhancements to both transcript content and video output

### Requirement 4

**User Story:** As a content creator, I want real-time synchronization between transcript and video, so that I always know which part of the content I'm editing.

#### Acceptance Criteria

1. WHEN video is playing THEN the system SHALL highlight the currently spoken word in the transcript
2. WHEN video playback progresses THEN the system SHALL auto-scroll the transcript to keep the active word visible
3. WHEN a user pauses the video THEN the system SHALL maintain the highlight on the last spoken word
4. WHEN a user makes transcript edits THEN the system SHALL immediately update the video timeline and captions
5. WHEN synchronization is lost THEN the system SHALL provide a re-sync option to realign transcript with audio

### Requirement 5

**User Story:** As a content creator, I want advanced transcript editing capabilities, so that I can efficiently clean up and enhance my spoken content.

#### Acceptance Criteria

1. WHEN a user selects text in the transcript THEN the system SHALL provide options to cut, copy, delete, or insert pauses
2. WHEN a user right-clicks on transcript text THEN the system SHALL show a context menu with editing options
3. WHEN a user inserts a pause THEN the system SHALL add silence to the corresponding video segment
4. WHEN a user splits text THEN the system SHALL create separate video segments at that point
5. WHEN a user merges text segments THEN the system SHALL combine the corresponding video portions

### Requirement 6

**User Story:** As a content creator, I want the interface to use the existing neu design system, so that the new layout feels consistent with the current editor experience.

#### Acceptance Criteria

1. WHEN the editor loads THEN the system SHALL use existing neu typography, colors, and spacing
2. WHEN displaying transcript content THEN the system SHALL use consistent card designs, borders, and shadows from neu
3. WHEN showing interactive elements THEN the system SHALL maintain existing button styles and hover effects
4. WHEN displaying the video preview THEN the system SHALL use existing preview player components with appropriate sizing
5. WHEN showing loading states THEN the system SHALL use consistent loading animations and indicators

### Requirement 7

**User Story:** As a content creator, I want this layout to be the new standard, so that all future projects benefit from the transcript-first approach.

#### Acceptance Criteria

1. WHEN a user creates a new project THEN the system SHALL default to the transcript-first layout
2. WHEN a user opens any existing project THEN the system SHALL convert it to use the new layout
3. WHEN the system updates THEN the system SHALL maintain the transcript-first layout as the primary editing interface
4. WHEN a user accesses video editing features THEN the system SHALL consistently present the transcript-first approach
5. WHEN new editing features are added THEN the system SHALL integrate them with the transcript-first workflow

### Requirement 8

**User Story:** As a content creator, I want the interface to feel as polished as Submagic, so that I have a professional, intuitive editing experience.

#### Acceptance Criteria

1. WHEN using the transcript editor THEN the system SHALL provide clean, minimal styling with clear line spacing
2. WHEN interacting with transcript text THEN the system SHALL provide smooth, responsive feedback
3. WHEN viewing the video preview THEN the system SHALL display it in a rounded, shadowed frame with elegant proportions
4. WHEN making edits THEN the system SHALL provide instant visual feedback without lag or stuttering
5. WHEN completing actions THEN the system SHALL use subtle animations and transitions that feel premium and polished