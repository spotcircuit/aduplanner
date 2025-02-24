import html2canvas from 'html2canvas';
import { PropertyBounds } from '@/types/property';

export async function captureMapView(
  map: google.maps.Map,
  propertyBounds: PropertyBounds
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary div for the Static Map
      const staticMapDiv = document.createElement('div');
      staticMapDiv.style.width = '640px';  // Max size for Vision API
      staticMapDiv.style.height = '640px';
      document.body.appendChild(staticMapDiv);

      // Calculate center and zoom
      const center = {
        lat: (propertyBounds.ne.lat + propertyBounds.sw.lat) / 2,
        lng: (propertyBounds.ne.lng + propertyBounds.sw.lng) / 2
      };

      // Create static map
      const staticMap = new google.maps.Map(staticMapDiv, {
        center,
        zoom: map.getZoom(),
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        backgroundColor: '#FFFFFF'
      });

      // Wait for map to load
      google.maps.event.addListenerOnce(staticMap, 'idle', () => {
        try {
          // Convert the map div to a data URL
          html2canvas(staticMapDiv).then(canvas => {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            document.body.removeChild(staticMapDiv);
            resolve(dataUrl);
          }).catch(error => {
            document.body.removeChild(staticMapDiv);
            reject(error);
          });
        } catch (error) {
          document.body.removeChild(staticMapDiv);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
