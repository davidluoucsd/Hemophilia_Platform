# Hemophilia Assessment Platform

A comprehensive digital platform for hemophilia patient assessment using standardized questionnaires including HAL (Hemophilia Activities List) and HAEMO-QoL-A (Hemophilia Quality of Life Questionnaire for Adults).

## Features

### Patient Portal
- **Patient Registration & Login** - Secure patient account management
- **HAL Questionnaire** - Hemophilia Activities List for joint health assessment
- **HAEMO-QoL-A Questionnaire** - Quality of life assessment for adults with hemophilia
- **Progress Tracking** - Real-time questionnaire completion status
- **Results Dashboard** - View completed assessments and results

### Doctor Portal
- **Doctor Dashboard** - Overview of all patients and assessments
- **Patient Management** - Assign and monitor questionnaires
- **Task Assignment** - Create assessment tasks for specific patients
- **Results Analysis** - View detailed scoring and analysis of patient assessments
- **Data Export** - Export patient data and results (CSV, Excel formats)
- **Progress Monitoring** - Track patient questionnaire completion rates

### Technical Features
- **Dual-Role System** - Separate interfaces for patients and healthcare providers
- **Real-time Data Sync** - Instant updates across patient and doctor portals
- **Offline Capability** - Desktop application with local data storage
- **Data Visualization** - Interactive charts and graphs for assessment results
- **Secure Data Storage** - Local IndexedDB storage with data integrity
- **Cross-Platform** - Works as web application or desktop app

## Technology Stack

- **Frontend Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Desktop Application**: Electron
- **State Management**: Zustand
- **Data Visualization**: Chart.js
- **Database**: IndexedDB (client-side)
- **Build Tools**: Next.js build system with Electron Builder

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hemophilia-next
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the Next.js development server:
```bash
npm run dev
```

Start Electron development mode:
```bash
npm run electron-dev
```

### Building

Build web application:
```bash
npm run build
```

Build desktop application:
```bash
npm run electron-build
```

## Application Structure

### Patient Workflow
1. **Registration/Login** - Patients create accounts or log in
2. **Dashboard** - View assigned questionnaires and progress
3. **Questionnaire Completion** - Complete HAL and/or HAEMO-QoL-A assessments
4. **Results Review** - View completion status and basic results

### Doctor Workflow
1. **Login** - Healthcare providers access doctor portal
2. **Patient Management** - View all patients and their assessment status
3. **Task Assignment** - Assign specific questionnaires to patients
4. **Results Analysis** - Review detailed scoring and patient progress
5. **Data Export** - Generate reports and export data

## Questionnaire Details

### HAL (Hemophilia Activities List)
- **Purpose**: Assess functional limitations in hemophilia patients
- **Categories**: Legs/feet, arms/hands, basic functions, complex functions
- **Scoring**: 1-6 scale (impossible to do → never difficult)
- **Output**: Domain scores and total sum score

### HAEMO-QoL-A (Hemophilia Quality of Life - Adults)
- **Purpose**: Measure quality of life in adult hemophilia patients
- **Domains**: Physical health, feelings/emotions, view of others, sports/school
- **Scoring**: 1-5 scale (never → always)
- **Output**: Domain scores and total percentage score

## Data Management

- **Local Storage**: All data stored locally using IndexedDB
- **Data Integrity**: Built-in validation and error handling
- **Privacy**: No external data transmission, complete local control
- **Backup**: Manual data export capabilities for backup purposes

## Security & Privacy

- **Local-First**: All data remains on the local device
- **No External APIs**: No internet connection required for core functionality
- **User Authentication**: Simple role-based access control
- **Data Ownership**: Complete user control over their data

## Distribution

The application can be distributed as:
- **Web Application**: Deployed on web servers
- **Desktop Application**: Windows executable (.exe)
- **Portable Version**: No-install zip package

## Development Status

✅ **Completed Features**:
- Patient and doctor authentication systems
- HAL questionnaire implementation
- HAEMO-QoL-A questionnaire implementation
- Real-time progress tracking
- Results calculation and display
- Task assignment system
- Data export functionality
- Desktop application packaging

🔧 **Current Focus**:
- Performance optimization
- User experience improvements
- Enhanced data visualization
- Advanced reporting features

## License & Copyright

© 2024 Junzhe Luo. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited without explicit written permission from the copyright holder.

## Support

For technical support or feature requests, please contact the development team.
