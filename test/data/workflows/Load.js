{ 
  "description": "Load",
  "rev": "1.0",
  "schema_rev": "0.1",

  "grouperProtocol": { 
    "order": ["lc"], 
    "lc":{ 
      "type":"grouper:loadCartridge", 
      "rev":"1.0"
    }, 
    "options":{ 
      "protocolOptions":{ 
        "sampleID":"InputName" 
      }, 
      "recipeOptions":{
        "lc":{} 
      } 
    } 
  }, 
  "analysisProtocol": { 
    "order": ["grouperEventCollation","rotateGrouperArray","EndReceiver"], 
    "EndReceiver": { 
      "className": "EndReceiver", 
      "nextClassNameToLoad": "rotateGrouperArray", 
      "passClassName": null, 
      "failClassName": null 
    }, 
    "rotateGrouperArray": { 
      "className": "rotateGrouperArray", 
      "nextClassNameToLoad": "grouperEventCollation", 
      "passClassName": "EndReceiver", 
      "failClassName": null 
    }, 
    "grouperEventCollation": { 
      "className": "grouperEventCollation", 
      "nextClassNameToLoad": null, 
      "passClassName": "rotateGrouperArray", 
      "failClassName": null 
    }, 
    "options": { 
      "workflowOptions": { 
        "loggingDirectoryRoot":"/tmp/fromWFDescOpts/dummyGrouper" 
      }, 
      "componentOptions": { 
        "EndReceiver": {}, 
        "rotateGrouperArray": {}, 
        "grouperEventCollation": {} 
      } 
    } 
  } 
}
