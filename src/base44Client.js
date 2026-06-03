{
  "name": "WorkwearRequest",
  "type": "object",
  "properties": {
    "requested_by_email": {
      "type": "string",
      "description": "E-post för den som gjorde begäran"
    },
    "requested_by_name": {
      "type": "string",
      "description": "Namn på den som gjorde begäran"
    },
    "recipient_first_name": {
      "type": "string",
      "description": "Förnamn på mottagare"
    },
    "recipient_last_name": {
      "type": "string",
      "description": "Efternamn på mottagare"
    },
    "project": {
      "type": "string",
      "description": "Projektnummer"
    },
    "requested_items": {
      "type": "array",
      "description": "Lista på begärda artiklar",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "subcategory": {
            "type": "string"
          },
          "quantity": {
            "type": "number"
          }
        }
      }
    },
    "request_date": {
      "type": "string",
      "format": "date-time",
      "description": "Datum och tid för begäran"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "approved",
        "rejected",
        "fulfilled"
      ],
      "default": "pending",
      "description": "Status på begäran"
    },
    "approved_by_email": {
      "type": "string",
      "description": "E-post för den som godkände begäran"
    },
    "approved_by_name": {
      "type": "string",
      "description": "Namn på den som godkände begäran"
    },
    "approval_date": {
      "type": "string",
      "format": "date-time",
      "description": "Datum och tid för godkännande"
    },
    "notes": {
      "type": "string",
      "description": "Anteckningar på begäran"
    }
  },
  "required": [
    "recipient_first_name",
    "recipient_last_name",
    "requested_items",
    "request_date"
  ]
}