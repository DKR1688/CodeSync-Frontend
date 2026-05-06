# CodeSync-Frontend - Progress Log
> This log documents the progress completed for the CodeSync frontend project. Entries are grouped by week and summarize the main UI and integration milestones across the Angular application.

> **Current Structure of GitHub :-**
```text
CodeSync-Frontend/
|
|-- src/
|   |
|   |-- app/
|   |   |-- core/
|   |   |-- features/
|   |   |   |-- admin/
|   |   |   |-- auth/
|   |   |   |-- collaboration/
|   |   |   |-- comments/
|   |   |   |-- dashboard/
|   |   |   |-- editor/
|   |   |   |-- landing/
|   |   |   |-- notifications/
|   |   |   |-- profile/
|   |   |   |-- projects/
|   |   |   +-- version-history/
|   |   |
|   |   |-- app.routes.ts
|   |   +-- app.config.ts
|   |
|   |-- main.ts
|   +-- styles.css
|
|-- public/
|-- angular.json
|-- package.json
|-- sonar-project.properties
+-- README.md
```

## Week 01 - Frontend Setup and UI Flow
> **27-April-2026 :-** Started planning and preparing the frontend structure for CodeSync-Frontend; organized the Angular project direction for authentication, dashboard, project pages, editor, collaboration, comments, notifications, profile and admin feature modules;

> **28-April-2026 :-** Refactored frontend pages and improved the application screen structure to create a cleaner UI flow for the CodeSync platform [Click Here](https://github.com/DKR1688/CodeSync-Frontend/blob/main/src/app/features);

> **29-April-2026 :-** Continued frontend route and page alignment for public pages, protected pages, role-based access flow, login/register screens and connected screen navigation through Angular routes [Click Here](https://github.com/DKR1688/CodeSync-Frontend/blob/main/src/app/app.routes.ts);

> **30-April-2026 :-** Improved the frontend project browsing, project detail, editor navigation, collaboration route mapping and supporting UI structure needed for backend-connected repository flows [Click Here](https://github.com/DKR1688/CodeSync-Frontend/blob/main/src/app/features/projects);

> **01-May-2026 :-** Added the Angular frontend application to the repository; refactored styling into the current CSS-based structure and updated configuration files including package setup and ignore rules [Click Here](./package.json) and [Click Here](https://github.com/DKR1688/CodeSync-Frontend/blob/main/src/styles.css);

> **02-May-2026 :-** Stabilized the implemented frontend features for project creation, file editing, collaboration sessions, comments, version history, notifications, profile and admin access so the UI can support complete backend integration testing [Click Here](https://github.com/DKR1688/CodeSync-Frontend/blob/main/src/app/features);


## Week 02
> **05-May-2026 :-** Started SonarQube Cloud onboarding for the frontend repository using GitHub-based analysis flow; prepared the frontend scan configuration with source paths, test inclusion, exclusions and coverage reporting settings in [Click Here](https://github.com/DKR1688/CodeSync-Frontend/sonar-project.properties);

> **06-May-2026 :-** Reviewed the route, guard and actor-based UI coverage for guest, authenticated user, owner, member, collaboration participant and admin flows [Click Here](https://github.com/DKR1688/CodeSync-Frontend/blob/main/src/app/app.routes.ts);
