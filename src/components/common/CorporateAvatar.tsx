import React from 'react';
import { AvatarArchetype } from '../../services/visualAssetsRegistry';

export interface CorporateAvatarProps {
  archetype?: AvatarArchetype;
  type?: AvatarArchetype;
  name?: string;
  role?: string;
  email?: string;
  departmentId?: string;
  profession?: string;
  gender?: 'male' | 'female';
  category?: string;
  isCandidate?: boolean;
  isClient?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'busy' | 'verified' | 'speaking' | 'listening' | 'none';
  badgeText?: string;
  className?: string;
}

/**
 * CorporateAvatar
 * Per institutional UI guidelines (DESIGN-mobbin.md), human/person avatars and illustrations
 * for users, clients, employees, and candidates are disabled across the platform.
 */
export const CorporateAvatar: React.FC<CorporateAvatarProps> = () => {
  return null;
};

export default CorporateAvatar;
