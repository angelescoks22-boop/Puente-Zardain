export interface IPendingOtp {

  id: string;

  email: string;

  phone?: string;

  name?: string;

  passwordHash?: string;

  otp: string;

  attempts: number;

  expiresAt: Date;

  pendingAddress?: {

    fullAddress: string;

    city: string;

    lat: number;

    lng: number;

    placeId?: string;

    portal?: string;

    floor?: string;

    door?: string;

    details?: string;

  };

}

