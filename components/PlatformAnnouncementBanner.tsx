import React, { useState, useEffect } from 'react';
import { getPlatformSettings } from '../services/platformSettingsService';
import { PlatformSettings } from '../types';
import XIcon from './icons/XIcon';

const PlatformAnnouncementBanner: React.FC = () => {
    // Disabled for MVP - getPlatformSettings is async and fails
    // Return null to prevent errors
    return null;
};

export default PlatformAnnouncementBanner;