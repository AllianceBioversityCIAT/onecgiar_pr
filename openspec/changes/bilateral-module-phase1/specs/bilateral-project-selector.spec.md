## bilateral-project-selector

The bilateral project selector allows center users to select a bilateral project from a filtered dropdown. The project data includes lead center, summary, description, and mapped Science Programs with allocation percentages.

### Requirements

- REQ-1: Endpoint `GET /api/bilateral/projects?centerId={id}` returns projects filtered by center (`organization_code`).
- REQ-2: Each project includes nested `sciencePrograms[]` with `programId`, `programCode`, `allocation`, `spName`, `spShortName`.
- REQ-3: The `programCode` matches `ClarisaInitiative.official_code` (guaranteed by data sync).
- REQ-4: Only active projects (`is_active = 1`) are returned.
- REQ-5: Lead center info (name, acronym) included per project via `organization_code` → `clarisa_institutions` join.

### API Contract

```
GET /api/bilateral/projects?centerId={centerId}

Response:
{
  "response": {
    "projects": [
      {
        "id": 2837,
        "shortName": "Wheat Yield Improvement",
        "fullName": "Improved wheat varieties for climate resilience in South Asia",
        "summary": "This project develops and tests new bread wheat varieties...",
        "description": "Full project description...",
        "leadCenter": {
          "id": 10,
          "name": "CIMMYT - International Maize and Wheat Improvement Center",
          "acronym": "CIMMYT"
        },
        "sciencePrograms": [
          {
            "programId": 101,
            "programCode": "P11",
            "allocation": "45.00",
            "spName": "Climate Action",
            "spShortName": "CA"
          },
          {
            "programId": 102,
            "programCode": "P14",
            "allocation": "25.00",
            "spName": "Breeding for Tomorrow",
            "spShortName": "BfT"
          }
        ]
      }
    ]
  },
  "message": "Bilateral projects retrieved successfully",
  "status": 200
}
```
