import type { ValidatedAddress } from '../types';
import { apiFetch } from './client';

export type AddressValidationResult = {
  valid: boolean;
  message: string;
  address?: ValidatedAddress;
};

export async function validateAddress(address: ValidatedAddress): Promise<AddressValidationResult> {
  return apiFetch('/auth/validate-address', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

export async function fetchAddressSuggestions(query: string): Promise<ValidatedAddress[]> {
  if (query.length < 3) return [];
  return apiFetch(`/auth/address-suggestions?q=${encodeURIComponent(query)}`);
}

export async function addUserAddress(
  address: ValidatedAddress,
  options?: { label?: string; setDefault?: boolean },
) {
  return apiFetch<import('../types').User>('/auth/me/addresses', {
    method: 'POST',
    body: JSON.stringify({ address, ...options }),
  });
}

export async function setDefaultAddress(addressId: string) {
  return apiFetch<import('../types').User>(`/auth/me/addresses/${addressId}/default`, {
    method: 'PATCH',
  });
}

export async function deleteUserAddress(addressId: string) {
  return apiFetch<import('../types').User>(`/auth/me/addresses/${addressId}`, {
    method: 'DELETE',
  });
}
