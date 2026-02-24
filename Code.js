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
      Logger.log("Stack: " + error.stack);
    }
  }

  // ============================================
  // POPULATE DROPDOWNS FROM SEPARATE SHEETS
  // (Only shows items with Status = "Available")
  // ============================================
  function populateDropdowns() {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    const tapesData = ss.getSheetByName(TAPES_SHEET).getDataRange().getValues();
    const decodersData = ss.getSheetByName(DECODERS_SHEET).getDataRange().getValues();

    // Find column indices
    const tapeHeaders = tapesData[0];
    const decoderHeaders = decodersData[0];

    let tapeNameCol = -1, tapeFactionCol = -1;
    let decoderNameCol = -1, decoderFactionCol = -1;

    tapeHeaders.forEach((h, i) => {
      Logger.log("Tape header: " + h);
      if (h.toString().includes('TAPE')) tapeNameCol = i;
      if (h.toString().toUpperCase() === 'FACTION') tapeFactionCol = i;
    });

    decoderHeaders.forEach((h, i) => {
      Logger.log("Decoder header: " + h);
      if (h.toString().includes('DECODER')) decoderNameCol = i;
      if (h.toString().toUpperCase() === 'FACTION') decoderFactionCol = i;
    });

    Logger.log("tapeNameCol: " + tapeNameCol + ", tapeFactionCol: " + tapeFactionCol);
    Logger.log("decoderNameCol: " + decoderNameCol + ", decoderFactionCol: " + decoderFactionCol);

    // Filter to only unclaimed items (FACTION is empty) (skip header row)
    const tapes = tapesData.slice(1)
      .filter(row => tapeNameCol !== -1 && row[tapeNameCol] && (tapeFactionCol === -1 || !row[tapeFactionCol]))
      .map(row => row[tapeNameCol].toString());

    const decoders = decodersData.slice(1)
      .filter(row => decoderNameCol !== -1 && row[decoderNameCol] && (decoderFactionCol === -1 || !row[decoderFactionCol]))
      .map(row => row[decoderNameCol].toString());

    Logger.log("Found " + tapes.length + " available tapes, " + decoders.length + " available decoders");

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

      Logger.log("New submission: " + faction + " | Tape: " + tape + " | Decoder: " + decoder);

      // Mark tape and decoder as claimed by this faction
      markAsClaimed(TAPES_SHEET, tape, faction);
      markAsClaimed(DECODERS_SHEET, decoder, faction);

      // Refresh form dropdowns to remove claimed items
      populateDropdowns();

      // Update claimed combos tab (for reference)
      updateClaimedTab(tape, decoder, faction);

      Logger.log("✓ Items marked as claimed, dropdowns refreshed");

    } catch (error) {
      Logger.log("❌ Error in onFormSubmit: " + error);
      Logger.log("Stack: " + error.stack);
    }
  }

  // ============================================
  // MARK ITEM AS CLAIMED IN SHEET (sets FACTION)
  // ============================================
  function markAsClaimed(sheetName, itemName, faction) {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();

    // Find column indices
    const headers = data[0];
    let nameCol = -1, factionCol = -1;

    Logger.log("Looking for item '" + itemName + "' in " + sheetName);
    Logger.log("Headers: " + headers.join(", "));

    headers.forEach((h, i) => {
      if (h.toString().includes('TAPE') || h.toString().includes('DECODER')) {
        nameCol = i;
      }
      if (h.toString().toUpperCase() === 'FACTION') {
        factionCol = i;
      }
    });

    Logger.log("Found columns - nameCol: " + nameCol + ", factionCol: " + factionCol);

    if (nameCol === -1) {
      Logger.log("⚠️  Could not find name column in " + sheetName);
      return;
    }

    // Find and update the row
    for (let i = 1; i < data.length; i++) {
      if (data[i][nameCol] && data[i][nameCol].toString() === itemName) {
        if (factionCol !== -1) {
          // Update FACTION column
          const range = sheet.getRange(i + 1, factionCol + 1);
          range.setValue(faction);
          Logger.log("✓ Marked '" + itemName + "' as claimed by " + faction + " in " + sheetName);
        } else {
          Logger.log("⚠️  No FACTION column found in " + sheetName + ", item not marked");
        }
        return;
      }
    }

    Logger.log("⚠️  Could not find item '" + itemName + "' in " + sheetName);
  }

  // ============================================
  // UPDATE CLAIMED COMBOS TAB (for reference)
  // ============================================
  function updateClaimedTab(tape, decoder, faction) {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // Create "Claimed" tab if it doesn't exist
    let claimedSheet = ss.getSheetByName("Claimed");
    if (!claimedSheet) {
      claimedSheet = ss.insertSheet("Claimed");
      claimedSheet.appendRow(["Data Tape", "Decoder", "Faction", "Claimed At"]);
      Logger.log("Created 'Claimed' tab");
    }

    // Add the new combo
    claimedSheet.appendRow([tape, decoder, faction, new Date()]);
    Logger.log("Added to Claimed tab: " + tape + " + " + decoder);
  }
