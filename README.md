# ADU Planner

An AI-powered Next.js application for planning Accessory Dwelling Units (ADUs) using satellite imagery analysis and interactive property planning tools.

## Features

### 1. AI Vision Analysis
- **Automatic Property Analysis**
  - Property type detection (single-family vs townhouse)
  - Buildable area identification with size estimates
  - Setback measurements from property lines
  - Existing structure detection and location mapping
  - Confidence scoring for analysis results

- **ADU Placement Validation**
  - Real-time validation of proposed ADU locations
  - Setback compliance checking
  - Smart placement suggestions
  - Visual feedback for valid/invalid placements

### 2. Interactive Planning Tools
- Property boundary drawing with Google Maps
- Area and distance measurements
- ADU placement and sizing tools
- Real-time zoning compliance checks
- Satellite view analysis

### 3. Property Information
- Address autocomplete with Google Places API
- Zoning information lookup
- Property dimensions calculation
- Setback visualization
- Buildable area highlighting

## Quick Start

### Prerequisites
```bash
# Required software
- Node.js 18+
- npm or yarn
- Git

# Required API Keys
- Google Maps API key (with Places, Maps JavaScript API enabled)
- OpenAI API key (with GPT-4 Vision access)
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aduplanner-next
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENAI_API_KEY=your_openai_key
OPENAI_ORGANIZATION_ID=your_org_id
OPENAI_MODEL=gpt-40-mini
```

4. Run the development server:
```bash
npm run dev
```

## Usage Guide

### 1. Property Analysis
1. Enter an address in the search bar
2. Draw the property boundary on the map
3. Wait for the AI vision analysis to complete
4. Review the analysis results:
   - Property type classification
   - Buildable areas and sizes
   - Setback measurements
   - Existing structures

### 2. ADU Planning
1. Use the drawing tools to place an ADU
2. The system will automatically:
   - Validate setback compliance
   - Check size restrictions
   - Suggest optimal placements
3. Adjust the placement based on AI feedback

### 3. Vision Analysis Features
- **Property Type Detection**
  - Automatically identifies if the property is single-family or townhouse
  - High confidence results affect eligibility status
  - Manual re-analysis available

- **Buildable Area Analysis**
  - Identifies front, back, and side yards
  - Estimates usable space in each area
  - Considers existing structures

- **Setback Measurement**
  - Automatic measurement of setbacks from property lines
  - Front, back, and side setback detection
  - Compliance checking with local regulations

## Project Structure

```
aduplanner-next/
├── app/
│   ├── api/
│   │   └── vision/
│   │       ├── analyze/    # Property analysis endpoint
│   │       └── validate/   # ADU placement validation
│   └── page.tsx
├── components/
│   ├── map/
│   │   └── tools/         # Drawing and measurement tools
│   └── property/
│       ├── PropertyPlanner.tsx
│       └── AddressAutocomplete.tsx
├── lib/
│   ├── mapCapture.ts      # Map screenshot utilities
│   ├── propertyAnalysis.ts
│   └── visionAnalysis.ts  # GPT-4 Vision integration
└── types/
    └── property.ts        # TypeScript definitions
```

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Adding New Features
1. Create feature branch
2. Implement changes
3. Add tests
4. Create pull request

## Troubleshooting

### Common Issues
1. **Vision Analysis Fails**
   - Check API key permissions
   - Verify satellite image is clear
   - Try redrawing property boundary

2. **Map Loading Issues**
   - Verify Google Maps API key
   - Check API quota usage
   - Enable required Google APIs

3. **ADU Validation Errors**
   - Confirm property boundary is accurate
   - Check setback requirements
   - Verify property type detection

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with Next.js 14
- Uses Google Maps Platform
- Powered by OpenAI's GPT-4 Vision
- Inspired by ADU-Planner RAG-a-thon 2024
