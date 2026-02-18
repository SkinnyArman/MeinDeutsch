export const API_ENDPOINTS = [
    {
        id: "health",
        method: "GET",
        path: "/api/health",
        title: "Health Check",
        description: "Checks API and DB connectivity.",
        requestFields: []
    },
    {
        id: "submit-text",
        method: "POST",
        path: "/api/submissions/text",
        title: "Submit Text",
        description: "Submits German text for analysis and persistence.",
        requestFields: [
            {
                name: "prompt",
                label: "Prompt",
                type: "text",
                required: true,
                placeholder: "Describe your weekend in German"
            },
            {
                name: "answerText",
                label: "Answer Text",
                type: "textarea",
                required: true,
                placeholder: "Am Wochenende ich habe mit meine Freund gehen park."
            }
        ]
    }
];
