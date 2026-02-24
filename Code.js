 // ============================================
  // N26 DECODER SUBMISSION FORM - APPS SCRIPT
  // ============================================

  // CONFIGURATION - Update these with your info
  const SHEET_ID = "1MRDIEWWvGdmcUsqj7w4OimqAN2s0e2zk2Eb7R24hV58";
  const FORM_ID = "1RhrIR0lhoG4BGFXkLVVGFgZC8L8Bmu8-TE1iOkP2r_Q";
  const TAPES_SHEET = "Data Tapes";
  const DECODERS_SHEET = "Decoders";

  const form = FormApp.openById(FORM_ID);

  // ============================================
  // SETUP FUNCTION - Run this once!
  // ============================================
  function setup() {
    Logger.log("Starting setup...");

    try {
      populateDropdowns();
      Logger.log("✓ Dropdowns populated");

      createSubmitTrigger();
      Logger.log("✓ Form submission trigger created");

      Logger.log("\n✅ SETUP COMPLETE!");
      Logger.log("Your form is ready to use.");
    } catch (error) {
      Logger.log("❌ Setup error: " + error);
    }
  }

  // ============================================
  // POPULATE DROPDOWNS FROM SEPARATE SHEETS
  // ============================================
  function populateDropdowns() {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    const tapesData = ss.getSheetByName(TAPES_SHEET).getDataRange().getValues();
    const decodersData = ss.getSheetByName(DECODERS_SHEET).getDataRange().getValues();

    // First column of each sheet, skip header row
    const tapes = tapesData.slice(1).map(row => row[0].toString()).filter(v => v);
    const decoders = decodersData.slice(1).map(row => row[0].toString()).filter(v => v);

    Logger.log("Found " + tapes.length + " tapes, " + decoders.length + " decoders");

    const items = form.getItems();
    let tapeUpdated = false, decoderUpdated = false;

    items.forEach(item => {
      const title = item.getTitle();
      if (title === 'Data Tape' && item.getType() === FormApp.ItemType.LIST) {
        item.asListItem().setChoices(tapes.map(t => item.asListItem().createChoice(t)));
        tapeUpdated = true;
      }
      if (title === 'Decoder' && item.getType() === FormApp.ItemType.LIST) {
        item.asListItem().setChoices(decoders.map(d => item.asListItem().createChoice(d)));
        decoderUpdated = true;
      }
    });

    if (!tapeUpdated) throw new Error("Could not find 'Data Tape' field in form");
    if (!decoderUpdated) throw new Error("Could not find 'Decoder' field in form");

    Logger.log("✓ Dropdowns populated");
  }

  // ============================================
  // CREATE FORM SUBMISSION TRIGGER
  // ============================================
  function createSubmitTrigger() {
    // Remove any existing submit triggers to avoid duplicates
    const allTriggers = ScriptApp.getProjectTriggers();
    allTriggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
        Logger.log("Removed existing trigger");
      }
    });

    // Create new trigger
    ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
  }

  // ============================================
  // HANDLE FORM SUBMISSIONS
  // ============================================
  function onFormSubmit(e) {
    try {
      const itemResponses = e.response.getItemResponses();

      let tape = '', decoder = '', email = '', faction = '';

      itemResponses.forEach(item => {
        const title = item.getItem().getTitle();
        const value = item.getResponse();
        if (title === 'Data Tape') tape = value;
        if (title === 'Decoder') decoder = value;
        if (title === 'Contact Email') email = value;
        if (title === 'Faction Name') faction = value;
      });

      Logger.log("New submission: " + faction + " | " + tape + " + " + decoder);

      // Update claimed tab
      updateClaimedTab(tape, decoder, faction);

      // Check for duplicates
      checkForDuplicateCombo(tape, decoder, faction, email);

    } catch (error) {
      Logger.log("❌ Error in onFormSubmit: " + error);
    }
  }

  // ============================================
  // UPDATE CLAIMED COMBOS TAB
  // ============================================
  function updateClaimedTab(tape, decoder, faction) {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // Create "Claimed" tab if it doesn't exist
    let claimedSheet = ss.getSheetByName("Claimed");
    if (!claimedSheet) {
      claimedSheet = ss.insertSheet("Claimed");
      claimedSheet.appendRow(["Data Tape", "Decoder", "Faction", "Submitted"]);
      Logger.log("Created 'Claimed' tab");
    }

    // Add the new combo
    claimedSheet.appendRow([tape, decoder, faction, new Date()]);
    Logger.log("Added to Claimed tab: " + tape + " + " + decoder);
  }

  // ============================================
  // CHECK FOR DUPLICATE COMBINATIONS
  // ============================================
  function checkForDuplicateCombo(tape, decoder, faction, email) {
    const allResponses = form.getResponses();
    const comboKey = tape + " + " + decoder;
    let duplicateFound = false;

    // Skip the most recent submission (we're checking against it)
    for (let i = 0; i < allResponses.length - 1; i++) {
      const prevItems = allResponses[i].getItemResponses();
      let prevTape = '', prevDecoder = '';

      prevItems.forEach(item => {
        const title = item.getItem().getTitle();
        if (title === 'Data Tape') prevTape = item.getResponse();
        if (title === 'Decoder') prevDecoder = item.getResponse();
      });

      if (prevTape === tape && prevDecoder === decoder) {
        duplicateFound = true;
        Logger.log("⚠️  DUPLICATE FOUND: " + comboKey);

        // Optional: Send email alert
        sendDuplicateAlert(faction, email, tape, decoder);
        break;
      }
    }

    if (!duplicateFound) {
      Logger.log("✓ Combo is unique: " + comboKey);
    }
  }

  // ============================================
  // SEND DUPLICATE ALERT EMAIL (Optional)
  // ============================================
  function sendDuplicateAlert(faction, email, tape, decoder) {
    if (!email) return; // Skip if no email provided

    const subject = "N26 Decoder Submission - Combo Already Taken";
    const message = `Hi ${faction},

Your submission used the combination:
- Data Tape: ${tape}
- Decoder: ${decoder}

Unfortunately, this combination was already claimed by another faction.

Please resubmit the form with a different decoder or data tape.

Available options: [Your form link]

Thanks!
CRuX Liaison`;

    MailApp.sendEmail(email, subject, message);
    Logger.log("Sent duplicate alert email to " + email);
  }
