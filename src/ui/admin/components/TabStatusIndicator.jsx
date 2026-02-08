import React from 'react';
import { Badge } from '@forge/react';

/**
 * Tab status indicator showing configured state
 */
export const TabStatusIndicator = ({ isConfigured }) => (
    isConfigured ? (
        <Badge appearance="added">✓</Badge>
    ) : null
);

export default TabStatusIndicator;
