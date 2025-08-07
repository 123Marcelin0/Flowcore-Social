/**
 * Test script to validate the empty track fix
 */

// Test the empty track validation
const testCases = [
  {
    name: "Valid edit with clips",
    edit: {
      timeline: {
        tracks: [
          {
            clips: [
              {
                asset: { type: "text", text: "Hello World" },
                start: 0,
                length: 3
              }
            ]
          }
        ]
      },
      output: { format: "mp4" }
    },
    shouldPass: true
  },
  {
    name: "Edit with empty track (should be filtered)",
    edit: {
      timeline: {
        tracks: [
          { clips: [] }, // Empty track - should be filtered out
          {
            clips: [
              {
                asset: { type: "text", text: "Hello World" },
                start: 0,
                length: 3
              }
            ]
          }
        ]
      },
      output: { format: "mp4" }
    },
    shouldPass: true // Should pass after filtering empty track
  },
  {
    name: "Edit with only empty tracks (should fail)",
    edit: {
      timeline: {
        tracks: [
          { clips: [] },
          { clips: [] }
        ]
      },
      output: { format: "mp4" }
    },
    shouldPass: false
  },
  {
    name: "Edit with missing timeline (should fail)",
    edit: {
      output: { format: "mp4" }
    },
    shouldPass: false
  }
];

// Simulate the validation function
function validateEditConfig(edit) {
  if (!edit.timeline) {
    throw new Error('Edit must have a timeline')
  }

  if (!edit.output || !edit.output.format) {
    throw new Error('Edit must specify output format')
  }
  
  // Filter out empty tracks BEFORE validation
  if (edit.timeline.tracks) {
    const originalTrackCount = edit.timeline.tracks.length;
    edit.timeline.tracks = edit.timeline.tracks.filter(track => 
      track && track.clips && Array.isArray(track.clips) && track.clips.length > 0
    );
    
    if (originalTrackCount !== edit.timeline.tracks.length) {
      console.log(`Filtered out ${originalTrackCount - edit.timeline.tracks.length} empty tracks`);
    }
  }
  
  // Check if we have any tracks left after filtering
  if (!edit.timeline.tracks || edit.timeline.tracks.length === 0) {
    throw new Error('Edit must have at least one track with clips in the timeline. All tracks were empty or invalid.')
  }
  
  // Validate each remaining track has valid clips
  for (let i = 0; i < edit.timeline.tracks.length; i++) {
    const track = edit.timeline.tracks[i];
    
    if (!track.clips || track.clips.length === 0) {
      throw new Error(`Track ${i + 1} must have at least one clip`)
    }
    
    // Validate each clip has required properties
    for (let j = 0; j < track.clips.length; j++) {
      const clip = track.clips[j];
      if (!clip.asset || !clip.asset.type) {
        throw new Error(`Track ${i + 1}, Clip ${j + 1} must have a valid asset with type`)
      }
      if (typeof clip.start !== 'number' || clip.start < 0) {
        throw new Error(`Track ${i + 1}, Clip ${j + 1} must have a valid start time (number >= 0)`)
      }
      if (typeof clip.length !== 'number' || clip.length <= 0) {
        throw new Error(`Track ${i + 1}, Clip ${j + 1} must have a valid length (number > 0)`)
      }
    }
  }
  
  console.log(`Validation passed: ${edit.timeline.tracks.length} tracks with total ${edit.timeline.tracks.reduce((sum, track) => sum + track.clips.length, 0)} clips`);
}

// Run tests
console.log('🧪 Testing Shotstack Empty Track Validation...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  try {
    // Create a copy of the edit to avoid modifying the original
    const editCopy = JSON.parse(JSON.stringify(testCase.edit));
    validateEditConfig(editCopy);
    
    if (testCase.shouldPass) {
      console.log('✅ PASS - Validation succeeded as expected\n');
    } else {
      console.log('❌ FAIL - Validation should have failed but passed\n');
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log(`✅ PASS - Validation failed as expected: ${error.message}\n`);
    } else {
      console.log(`❌ FAIL - Validation should have passed but failed: ${error.message}\n`);
    }
  }
});

console.log('🎉 Validation testing complete!');