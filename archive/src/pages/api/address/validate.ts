import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY || '',
        components: { country: 'US' },
      },
    });

    if (response.data.results.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const result = response.data.results[0];
    const { lat, lng } = result.geometry.location;
    const formattedAddress = result.formatted_address;

    // Check if the address is residential
    const isResidential = result.types.some(type => 
      ['house', 'street_address', 'residential'].includes(type)
    );

    if (!isResidential) {
      return res.status(400).json({ error: 'Address must be residential' });
    }

    return res.status(200).json({
      address: formattedAddress,
      location: { lat, lng },
      placeId: result.place_id,
    });
  } catch (error) {
    console.error('Error validating address:', error);
    return res.status(500).json({ error: 'Failed to validate address' });
  }
}
