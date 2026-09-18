/**
 * Offline place lookup.
 *
 * Birth places in India are often villages, and the app has to work with no
 * network, so geocoding cannot be an API call. This is a curated set covering
 * the cities and towns most births are registered in, plus the destinations
 * with large Indian diasporas.
 *
 * A production build should bundle a full GeoNames India extract (roughly
 * 500,000 populated places, about 10 MB compressed) behind the same interface,
 * loaded lazily on first search. The manual latitude/longitude entry path exists
 * precisely so that no user is ever blocked by a missing village.
 */
export interface Place {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const PLACES: Place[] = [
  // --- major metros ---
  { name: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
  { name: 'Delhi', region: 'Delhi', country: 'India', latitude: 28.7041, longitude: 77.1025, timezone: 'Asia/Kolkata' },
  { name: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Kolkata', region: 'West Bengal', country: 'India', latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata' },
  { name: 'Chennai', region: 'Tamil Nadu', country: 'India', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', region: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'Hyderabad', region: 'Telangana', country: 'India', latitude: 17.3850, longitude: 78.4867, timezone: 'Asia/Kolkata' },
  { name: 'Ahmedabad', region: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714, timezone: 'Asia/Kolkata' },
  { name: 'Pune', region: 'Maharashtra', country: 'India', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
  { name: 'Surat', region: 'Gujarat', country: 'India', latitude: 21.1702, longitude: 72.8311, timezone: 'Asia/Kolkata' },

  // --- north ---
  { name: 'Jaipur', region: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
  { name: 'Lucknow', region: 'Uttar Pradesh', country: 'India', latitude: 26.8467, longitude: 80.9462, timezone: 'Asia/Kolkata' },
  { name: 'Kanpur', region: 'Uttar Pradesh', country: 'India', latitude: 26.4499, longitude: 80.3319, timezone: 'Asia/Kolkata' },
  { name: 'Varanasi', region: 'Uttar Pradesh', country: 'India', latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata' },
  { name: 'Agra', region: 'Uttar Pradesh', country: 'India', latitude: 27.1767, longitude: 78.0081, timezone: 'Asia/Kolkata' },
  { name: 'Prayagraj', region: 'Uttar Pradesh', country: 'India', latitude: 25.4358, longitude: 81.8463, timezone: 'Asia/Kolkata' },
  { name: 'Meerut', region: 'Uttar Pradesh', country: 'India', latitude: 28.9845, longitude: 77.7064, timezone: 'Asia/Kolkata' },
  { name: 'Ghaziabad', region: 'Uttar Pradesh', country: 'India', latitude: 28.6692, longitude: 77.4538, timezone: 'Asia/Kolkata' },
  { name: 'Noida', region: 'Uttar Pradesh', country: 'India', latitude: 28.5355, longitude: 77.3910, timezone: 'Asia/Kolkata' },
  { name: 'Gurugram', region: 'Haryana', country: 'India', latitude: 28.4595, longitude: 77.0266, timezone: 'Asia/Kolkata' },
  { name: 'Faridabad', region: 'Haryana', country: 'India', latitude: 28.4089, longitude: 77.3178, timezone: 'Asia/Kolkata' },
  { name: 'Bareilly', region: 'Uttar Pradesh', country: 'India', latitude: 28.3670, longitude: 79.4304, timezone: 'Asia/Kolkata' },
  { name: 'Aligarh', region: 'Uttar Pradesh', country: 'India', latitude: 27.8974, longitude: 78.0880, timezone: 'Asia/Kolkata' },
  { name: 'Moradabad', region: 'Uttar Pradesh', country: 'India', latitude: 28.8386, longitude: 78.7733, timezone: 'Asia/Kolkata' },
  { name: 'Gorakhpur', region: 'Uttar Pradesh', country: 'India', latitude: 26.7606, longitude: 83.3732, timezone: 'Asia/Kolkata' },
  { name: 'Saharanpur', region: 'Uttar Pradesh', country: 'India', latitude: 29.9680, longitude: 77.5552, timezone: 'Asia/Kolkata' },
  { name: 'Mathura', region: 'Uttar Pradesh', country: 'India', latitude: 27.4924, longitude: 77.6737, timezone: 'Asia/Kolkata' },
  { name: 'Ayodhya', region: 'Uttar Pradesh', country: 'India', latitude: 26.7922, longitude: 82.1998, timezone: 'Asia/Kolkata' },
  { name: 'Jhansi', region: 'Uttar Pradesh', country: 'India', latitude: 25.4484, longitude: 78.5685, timezone: 'Asia/Kolkata' },
  { name: 'Firozabad', region: 'Uttar Pradesh', country: 'India', latitude: 27.1592, longitude: 78.3957, timezone: 'Asia/Kolkata' },
  { name: 'Chandigarh', region: 'Chandigarh', country: 'India', latitude: 30.7333, longitude: 76.7794, timezone: 'Asia/Kolkata' },
  { name: 'Ludhiana', region: 'Punjab', country: 'India', latitude: 30.9010, longitude: 75.8573, timezone: 'Asia/Kolkata' },
  { name: 'Amritsar', region: 'Punjab', country: 'India', latitude: 31.6340, longitude: 74.8723, timezone: 'Asia/Kolkata' },
  { name: 'Jalandhar', region: 'Punjab', country: 'India', latitude: 31.3260, longitude: 75.5762, timezone: 'Asia/Kolkata' },
  { name: 'Patiala', region: 'Punjab', country: 'India', latitude: 30.3398, longitude: 76.3869, timezone: 'Asia/Kolkata' },
  { name: 'Bathinda', region: 'Punjab', country: 'India', latitude: 30.2110, longitude: 74.9455, timezone: 'Asia/Kolkata' },
  { name: 'Ambala', region: 'Haryana', country: 'India', latitude: 30.3782, longitude: 76.7767, timezone: 'Asia/Kolkata' },
  { name: 'Panipat', region: 'Haryana', country: 'India', latitude: 29.3909, longitude: 76.9635, timezone: 'Asia/Kolkata' },
  { name: 'Karnal', region: 'Haryana', country: 'India', latitude: 29.6857, longitude: 76.9905, timezone: 'Asia/Kolkata' },
  { name: 'Rohtak', region: 'Haryana', country: 'India', latitude: 28.8955, longitude: 76.6066, timezone: 'Asia/Kolkata' },
  { name: 'Hisar', region: 'Haryana', country: 'India', latitude: 29.1492, longitude: 75.7217, timezone: 'Asia/Kolkata' },
  { name: 'Sonipat', region: 'Haryana', country: 'India', latitude: 28.9931, longitude: 77.0151, timezone: 'Asia/Kolkata' },
  { name: 'Srinagar', region: 'Jammu and Kashmir', country: 'India', latitude: 34.0837, longitude: 74.7973, timezone: 'Asia/Kolkata' },
  { name: 'Jammu', region: 'Jammu and Kashmir', country: 'India', latitude: 32.7266, longitude: 74.8570, timezone: 'Asia/Kolkata' },
  { name: 'Shimla', region: 'Himachal Pradesh', country: 'India', latitude: 31.1048, longitude: 77.1734, timezone: 'Asia/Kolkata' },
  { name: 'Dehradun', region: 'Uttarakhand', country: 'India', latitude: 30.3165, longitude: 78.0322, timezone: 'Asia/Kolkata' },
  { name: 'Haridwar', region: 'Uttarakhand', country: 'India', latitude: 29.9457, longitude: 78.1642, timezone: 'Asia/Kolkata' },
  { name: 'Rishikesh', region: 'Uttarakhand', country: 'India', latitude: 30.0869, longitude: 78.2676, timezone: 'Asia/Kolkata' },

  // --- west and central ---
  { name: 'Jodhpur', region: 'Rajasthan', country: 'India', latitude: 26.2389, longitude: 73.0243, timezone: 'Asia/Kolkata' },
  { name: 'Kota', region: 'Rajasthan', country: 'India', latitude: 25.2138, longitude: 75.8648, timezone: 'Asia/Kolkata' },
  { name: 'Bikaner', region: 'Rajasthan', country: 'India', latitude: 28.0229, longitude: 73.3119, timezone: 'Asia/Kolkata' },
  { name: 'Ajmer', region: 'Rajasthan', country: 'India', latitude: 26.4499, longitude: 74.6399, timezone: 'Asia/Kolkata' },
  { name: 'Udaipur', region: 'Rajasthan', country: 'India', latitude: 24.5854, longitude: 73.7125, timezone: 'Asia/Kolkata' },
  { name: 'Vadodara', region: 'Gujarat', country: 'India', latitude: 22.3072, longitude: 73.1812, timezone: 'Asia/Kolkata' },
  { name: 'Rajkot', region: 'Gujarat', country: 'India', latitude: 22.3039, longitude: 70.8022, timezone: 'Asia/Kolkata' },
  { name: 'Bhavnagar', region: 'Gujarat', country: 'India', latitude: 21.7645, longitude: 72.1519, timezone: 'Asia/Kolkata' },
  { name: 'Jamnagar', region: 'Gujarat', country: 'India', latitude: 22.4707, longitude: 70.0577, timezone: 'Asia/Kolkata' },
  { name: 'Nagpur', region: 'Maharashtra', country: 'India', latitude: 21.1458, longitude: 79.0882, timezone: 'Asia/Kolkata' },
  { name: 'Nashik', region: 'Maharashtra', country: 'India', latitude: 19.9975, longitude: 73.7898, timezone: 'Asia/Kolkata' },
  { name: 'Thane', region: 'Maharashtra', country: 'India', latitude: 19.2183, longitude: 72.9781, timezone: 'Asia/Kolkata' },
  { name: 'Aurangabad', region: 'Maharashtra', country: 'India', latitude: 19.8762, longitude: 75.3433, timezone: 'Asia/Kolkata' },
  { name: 'Solapur', region: 'Maharashtra', country: 'India', latitude: 17.6599, longitude: 75.9064, timezone: 'Asia/Kolkata' },
  { name: 'Kolhapur', region: 'Maharashtra', country: 'India', latitude: 16.7050, longitude: 74.2433, timezone: 'Asia/Kolkata' },
  { name: 'Amravati', region: 'Maharashtra', country: 'India', latitude: 20.9320, longitude: 77.7523, timezone: 'Asia/Kolkata' },
  { name: 'Nanded', region: 'Maharashtra', country: 'India', latitude: 19.1383, longitude: 77.3210, timezone: 'Asia/Kolkata' },
  { name: 'Sangli', region: 'Maharashtra', country: 'India', latitude: 16.8524, longitude: 74.5815, timezone: 'Asia/Kolkata' },
  { name: 'Jalgaon', region: 'Maharashtra', country: 'India', latitude: 21.0077, longitude: 75.5626, timezone: 'Asia/Kolkata' },
  { name: 'Akola', region: 'Maharashtra', country: 'India', latitude: 20.7002, longitude: 77.0082, timezone: 'Asia/Kolkata' },
  { name: 'Indore', region: 'Madhya Pradesh', country: 'India', latitude: 22.7196, longitude: 75.8577, timezone: 'Asia/Kolkata' },
  { name: 'Bhopal', region: 'Madhya Pradesh', country: 'India', latitude: 23.2599, longitude: 77.4126, timezone: 'Asia/Kolkata' },
  { name: 'Jabalpur', region: 'Madhya Pradesh', country: 'India', latitude: 23.1815, longitude: 79.9864, timezone: 'Asia/Kolkata' },
  { name: 'Gwalior', region: 'Madhya Pradesh', country: 'India', latitude: 26.2183, longitude: 78.1828, timezone: 'Asia/Kolkata' },
  { name: 'Ujjain', region: 'Madhya Pradesh', country: 'India', latitude: 23.1765, longitude: 75.7885, timezone: 'Asia/Kolkata' },
  { name: 'Raipur', region: 'Chhattisgarh', country: 'India', latitude: 21.2514, longitude: 81.6296, timezone: 'Asia/Kolkata' },
  { name: 'Bhilai', region: 'Chhattisgarh', country: 'India', latitude: 21.1938, longitude: 81.3509, timezone: 'Asia/Kolkata' },
  { name: 'Panaji', region: 'Goa', country: 'India', latitude: 15.4909, longitude: 73.8278, timezone: 'Asia/Kolkata' },

  // --- east and northeast ---
  { name: 'Patna', region: 'Bihar', country: 'India', latitude: 25.5941, longitude: 85.1376, timezone: 'Asia/Kolkata' },
  { name: 'Gaya', region: 'Bihar', country: 'India', latitude: 24.7914, longitude: 85.0002, timezone: 'Asia/Kolkata' },
  { name: 'Muzaffarpur', region: 'Bihar', country: 'India', latitude: 26.1209, longitude: 85.3647, timezone: 'Asia/Kolkata' },
  { name: 'Bhagalpur', region: 'Bihar', country: 'India', latitude: 25.2425, longitude: 86.9842, timezone: 'Asia/Kolkata' },
  { name: 'Darbhanga', region: 'Bihar', country: 'India', latitude: 26.1542, longitude: 85.8918, timezone: 'Asia/Kolkata' },
  { name: 'Ranchi', region: 'Jharkhand', country: 'India', latitude: 23.3441, longitude: 85.3096, timezone: 'Asia/Kolkata' },
  { name: 'Jamshedpur', region: 'Jharkhand', country: 'India', latitude: 22.8046, longitude: 86.2029, timezone: 'Asia/Kolkata' },
  { name: 'Dhanbad', region: 'Jharkhand', country: 'India', latitude: 23.7957, longitude: 86.4304, timezone: 'Asia/Kolkata' },
  { name: 'Bhubaneswar', region: 'Odisha', country: 'India', latitude: 20.2961, longitude: 85.8245, timezone: 'Asia/Kolkata' },
  { name: 'Cuttack', region: 'Odisha', country: 'India', latitude: 20.4625, longitude: 85.8830, timezone: 'Asia/Kolkata' },
  { name: 'Rourkela', region: 'Odisha', country: 'India', latitude: 22.2604, longitude: 84.8536, timezone: 'Asia/Kolkata' },
  { name: 'Howrah', region: 'West Bengal', country: 'India', latitude: 22.5958, longitude: 88.2636, timezone: 'Asia/Kolkata' },
  { name: 'Durgapur', region: 'West Bengal', country: 'India', latitude: 23.5204, longitude: 87.3119, timezone: 'Asia/Kolkata' },
  { name: 'Asansol', region: 'West Bengal', country: 'India', latitude: 23.6739, longitude: 86.9524, timezone: 'Asia/Kolkata' },
  { name: 'Siliguri', region: 'West Bengal', country: 'India', latitude: 26.7271, longitude: 88.3953, timezone: 'Asia/Kolkata' },
  { name: 'Guwahati', region: 'Assam', country: 'India', latitude: 26.1445, longitude: 91.7362, timezone: 'Asia/Kolkata' },
  { name: 'Shillong', region: 'Meghalaya', country: 'India', latitude: 25.5788, longitude: 91.8933, timezone: 'Asia/Kolkata' },
  { name: 'Imphal', region: 'Manipur', country: 'India', latitude: 24.8170, longitude: 93.9368, timezone: 'Asia/Kolkata' },
  { name: 'Agartala', region: 'Tripura', country: 'India', latitude: 23.8315, longitude: 91.2868, timezone: 'Asia/Kolkata' },
  { name: 'Aizawl', region: 'Mizoram', country: 'India', latitude: 23.7271, longitude: 92.7176, timezone: 'Asia/Kolkata' },
  { name: 'Kohima', region: 'Nagaland', country: 'India', latitude: 25.6751, longitude: 94.1086, timezone: 'Asia/Kolkata' },
  { name: 'Itanagar', region: 'Arunachal Pradesh', country: 'India', latitude: 27.0844, longitude: 93.6053, timezone: 'Asia/Kolkata' },
  { name: 'Gangtok', region: 'Sikkim', country: 'India', latitude: 27.3314, longitude: 88.6138, timezone: 'Asia/Kolkata' },

  // --- south ---
  { name: 'Coimbatore', region: 'Tamil Nadu', country: 'India', latitude: 11.0168, longitude: 76.9558, timezone: 'Asia/Kolkata' },
  { name: 'Madurai', region: 'Tamil Nadu', country: 'India', latitude: 9.9252, longitude: 78.1198, timezone: 'Asia/Kolkata' },
  { name: 'Tiruchirappalli', region: 'Tamil Nadu', country: 'India', latitude: 10.7905, longitude: 78.7047, timezone: 'Asia/Kolkata' },
  { name: 'Salem', region: 'Tamil Nadu', country: 'India', latitude: 11.6643, longitude: 78.1460, timezone: 'Asia/Kolkata' },
  { name: 'Erode', region: 'Tamil Nadu', country: 'India', latitude: 11.3410, longitude: 77.7172, timezone: 'Asia/Kolkata' },
  { name: 'Tirunelveli', region: 'Tamil Nadu', country: 'India', latitude: 8.7139, longitude: 77.7567, timezone: 'Asia/Kolkata' },
  { name: 'Vellore', region: 'Tamil Nadu', country: 'India', latitude: 12.9165, longitude: 79.1325, timezone: 'Asia/Kolkata' },
  { name: 'Thanjavur', region: 'Tamil Nadu', country: 'India', latitude: 10.7870, longitude: 79.1378, timezone: 'Asia/Kolkata' },
  { name: 'Puducherry', region: 'Puducherry', country: 'India', latitude: 11.9416, longitude: 79.8083, timezone: 'Asia/Kolkata' },
  { name: 'Mysuru', region: 'Karnataka', country: 'India', latitude: 12.2958, longitude: 76.6394, timezone: 'Asia/Kolkata' },
  { name: 'Hubballi', region: 'Karnataka', country: 'India', latitude: 15.3647, longitude: 75.1240, timezone: 'Asia/Kolkata' },
  { name: 'Mangaluru', region: 'Karnataka', country: 'India', latitude: 12.9141, longitude: 74.8560, timezone: 'Asia/Kolkata' },
  { name: 'Belagavi', region: 'Karnataka', country: 'India', latitude: 15.8497, longitude: 74.4977, timezone: 'Asia/Kolkata' },
  { name: 'Kalaburagi', region: 'Karnataka', country: 'India', latitude: 17.3297, longitude: 76.8343, timezone: 'Asia/Kolkata' },
  { name: 'Visakhapatnam', region: 'Andhra Pradesh', country: 'India', latitude: 17.6868, longitude: 83.2185, timezone: 'Asia/Kolkata' },
  { name: 'Vijayawada', region: 'Andhra Pradesh', country: 'India', latitude: 16.5062, longitude: 80.6480, timezone: 'Asia/Kolkata' },
  { name: 'Guntur', region: 'Andhra Pradesh', country: 'India', latitude: 16.3067, longitude: 80.4365, timezone: 'Asia/Kolkata' },
  { name: 'Nellore', region: 'Andhra Pradesh', country: 'India', latitude: 14.4426, longitude: 79.9865, timezone: 'Asia/Kolkata' },
  { name: 'Tirupati', region: 'Andhra Pradesh', country: 'India', latitude: 13.6288, longitude: 79.4192, timezone: 'Asia/Kolkata' },
  { name: 'Warangal', region: 'Telangana', country: 'India', latitude: 17.9689, longitude: 79.5941, timezone: 'Asia/Kolkata' },
  { name: 'Thiruvananthapuram', region: 'Kerala', country: 'India', latitude: 8.5241, longitude: 76.9366, timezone: 'Asia/Kolkata' },
  { name: 'Kochi', region: 'Kerala', country: 'India', latitude: 9.9312, longitude: 76.2673, timezone: 'Asia/Kolkata' },
  { name: 'Kozhikode', region: 'Kerala', country: 'India', latitude: 11.2588, longitude: 75.7804, timezone: 'Asia/Kolkata' },
  { name: 'Thrissur', region: 'Kerala', country: 'India', latitude: 10.5276, longitude: 76.2144, timezone: 'Asia/Kolkata' },
  { name: 'Kollam', region: 'Kerala', country: 'India', latitude: 8.8932, longitude: 76.6141, timezone: 'Asia/Kolkata' },
  { name: 'Kannur', region: 'Kerala', country: 'India', latitude: 11.8745, longitude: 75.3704, timezone: 'Asia/Kolkata' },

  // --- diaspora destinations ---
  { name: 'Dubai', region: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { name: 'Abu Dhabi', region: 'Abu Dhabi', country: 'UAE', latitude: 24.4539, longitude: 54.3773, timezone: 'Asia/Dubai' },
  { name: 'Doha', region: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.5310, timezone: 'Asia/Qatar' },
  { name: 'Kuwait City', region: 'Kuwait', country: 'Kuwait', latitude: 29.3759, longitude: 47.9774, timezone: 'Asia/Kuwait' },
  { name: 'Riyadh', region: 'Riyadh', country: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, timezone: 'Asia/Riyadh' },
  { name: 'Muscat', region: 'Muscat', country: 'Oman', latitude: 23.5880, longitude: 58.3829, timezone: 'Asia/Muscat' },
  { name: 'Singapore', region: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { name: 'Kuala Lumpur', region: 'Selangor', country: 'Malaysia', latitude: 3.1390, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
  { name: 'Kathmandu', region: 'Bagmati', country: 'Nepal', latitude: 27.7172, longitude: 85.3240, timezone: 'Asia/Kathmandu' },
  { name: 'Colombo', region: 'Western', country: 'Sri Lanka', latitude: 6.9271, longitude: 79.8612, timezone: 'Asia/Colombo' },
  { name: 'Dhaka', region: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka' },
  { name: 'Karachi', region: 'Sindh', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi' },
  { name: 'Lahore', region: 'Punjab', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, timezone: 'Asia/Karachi' },
  { name: 'London', region: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'Birmingham', region: 'England', country: 'United Kingdom', latitude: 52.4862, longitude: -1.8904, timezone: 'Europe/London' },
  { name: 'Leicester', region: 'England', country: 'United Kingdom', latitude: 52.6369, longitude: -1.1398, timezone: 'Europe/London' },
  { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { name: 'Chicago', region: 'Illinois', country: 'United States', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
  { name: 'Houston', region: 'Texas', country: 'United States', latitude: 29.7604, longitude: -95.3698, timezone: 'America/Chicago' },
  { name: 'San Francisco', region: 'California', country: 'United States', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { name: 'Toronto', region: 'Ontario', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { name: 'Vancouver', region: 'British Columbia', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { name: 'Sydney', region: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Melbourne', region: 'Victoria', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
];

/** Case- and diacritic-insensitive prefix search, ranked so exact hits lead. */
export function searchPlaces(query: string, limit = 8): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const scored = PLACES
    .map((place) => {
      const name = place.name.toLowerCase();
      const region = place.region.toLowerCase();
      let score = -1;
      if (name === q) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (name.includes(q)) score = 2;
      else if (region.startsWith(q)) score = 3;
      else if (region.includes(q)) score = 4;
      return { place, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name));

  return scored.slice(0, limit).map((x) => x.place);
}

export function formatPlace(place: Place): string {
  return place.country === 'India'
    ? `${place.name}, ${place.region}`
    : `${place.name}, ${place.country}`;
}
