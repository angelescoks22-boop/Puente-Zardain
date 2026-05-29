/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace google.maps.places {
  enum PlacesServiceStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  }

  class AutocompleteService {
    getPlacePredictions(
      request: {
        input: string;
        sessionToken?: AutocompleteSessionToken;
        componentRestrictions?: { country: string | string[] };
        location?: google.maps.LatLng;
        radius?: number;
        types?: string[];
      },
      callback: (
        predictions: AutocompletePrediction[] | null,
        status: PlacesServiceStatus,
      ) => void,
    ): void;
  }

  class AutocompleteSessionToken {}

  class PlacesService {
    constructor(attrContainer: HTMLDivElement | google.maps.Map);
    getDetails(
      request: {
        placeId: string;
        fields?: string[];
        sessionToken?: AutocompleteSessionToken;
      },
      callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void,
    ): void;
  }

  interface AutocompletePrediction {
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text?: string;
    };
  }

  interface PlaceResult {
    place_id?: string;
    formatted_address?: string;
    name?: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
    geometry?: {
      location?: {
        lat(): number;
        lng(): number;
      };
    };
  }
}

declare namespace google.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }
}

declare const google: {
  maps: {
    places: typeof google.maps.places;
    LatLng: typeof google.maps.LatLng;
  };
};
