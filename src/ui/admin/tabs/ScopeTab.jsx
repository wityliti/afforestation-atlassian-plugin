import React from 'react';
import { Text, Stack, Textfield } from '@forge/react';
import { SectionHeader, FieldGroup } from '../components';

/**
 * Scope Tab - Project filtering settings
 */
export const ScopeTab = ({ config, updateConfig, notLinkedWarning }) => {
    return (
        <Stack space="space.150">
            <SectionHeader section="scope" />
            {notLinkedWarning}

            <FieldGroup
                label="Included Projects"
                tooltip="Only issues in these projects will earn impact. Leave empty to include all projects in your Jira instance."
            >
                <Textfield
                    placeholder="PROJ1, PROJ2, TEAM-A (leave empty for all projects)"
                    value={config?.scope?.includedProjects?.join(', ') || ''}
                    onChange={(e) => updateConfig('scope.includedProjects', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <Text size="small">Enter project keys separated by commas</Text>
            </FieldGroup>

            <FieldGroup
                label="Excluded Projects"
                tooltip="These projects are always excluded, even if they match include rules. Use for sensitive or internal projects."
            >
                <Textfield
                    placeholder="HR, LEGAL, INTERNAL"
                    value={config?.scope?.excludedProjects?.join(', ') || ''}
                    onChange={(e) => updateConfig('scope.excludedProjects', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <Text size="small">Enter project keys to exclude from impact tracking</Text>
            </FieldGroup>

            <FieldGroup
                label="Excluded Labels"
                tooltip="Issues with any of these labels will be ignored. Useful for marking specific issues that shouldn't count."
            >
                <Textfield
                    placeholder="no-impact, ignore, internal-only"
                    value={config?.scope?.labelExclusions?.join(', ') || ''}
                    onChange={(e) => updateConfig('scope.labelExclusions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <Text size="small">Add these labels to individual issues to exclude them from tracking</Text>
            </FieldGroup>
        </Stack>
    );
};

export default ScopeTab;
