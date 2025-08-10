// Simple ZIP code to coordinates mapping for common areas
// In production, you'd want to use a proper geocoding service
export const zipToCoordinates: Record<string, { lat: number; lon: number }> = {
  // Ohio ZIP codes
  '43123': { lat: 39.8862, lon: -82.8285 }, // Grove City, OH
  '43215': { lat: 39.9690, lon: -83.0030 }, // Columbus, OH
  '43201': { lat: 39.9950, lon: -83.0040 }, // Columbus, OH
  '43221': { lat: 40.0870, lon: -83.0190 }, // Upper Arlington, OH
  
  // California ZIP codes
  '90210': { lat: 34.0901, lon: -118.4065 }, // Beverly Hills, CA
  '94102': { lat: 37.7795, lon: -122.4187 }, // San Francisco, CA
  
  // New York ZIP codes
  '10001': { lat: 40.7506, lon: -73.9971 }, // New York, NY
  '10021': { lat: 40.7685, lon: -73.9583 }, // Upper East Side, NY
  
  // Texas ZIP codes
  '75201': { lat: 32.7815, lon: -96.7968 }, // Dallas, TX
  '77002': { lat: 29.7589, lon: -95.3677 }, // Houston, TX
  
  // Florida ZIP codes
  '33101': { lat: 25.7753, lon: -80.1937 }, // Miami, FL
  '32801': { lat: 28.5421, lon: -81.3790 }, // Orlando, FL
  
  // Default fallback to Columbus, OH area
  'default': { lat: 39.9612, lon: -82.9988 }
};

export function getCoordinatesFromZip(zipCode: string): { lat: number; lon: number } {
  return zipToCoordinates[zipCode] || zipToCoordinates['default'];
}