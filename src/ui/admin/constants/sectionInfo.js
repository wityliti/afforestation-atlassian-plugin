/**
 * Section info constants for admin tabs
 */
export const SECTION_INFO = {
    account: {
        title: 'Account Connection',
        description: 'Connect your Afforestation account to track environmental impact from your Jira work. Completed issues automatically sync to your ESG dashboard.',
        icon: '🔗',
        learnMoreUrl: 'https://afforestation.org/docs/jira-integration'
    },
    completion: {
        title: 'Completion Detection',
        description: 'Configure how Grow for Jira detects when work is complete. Issues matching these criteria will trigger impact calculations.',
        icon: '✅',
        tips: [
            'Status Category matching is recommended for most Jira workflows',
            'Combine multiple detection methods for complex workflows with custom statuses'
        ]
    },
    scope: {
        title: 'Project Scope',
        description: 'Define which projects and issues contribute to your environmental impact tracking. Use filters to include or exclude specific work.',
        icon: '📁',
        tips: [
            'Leave "Included Projects" empty to track all projects in your instance',
            'Use labels like "no-impact" to exclude one-off issues from tracking'
        ]
    },
    scoring: {
        title: 'Impact Scoring',
        description: 'Configure how Leaves (impact points) are calculated for each completed issue. Adjust the formula to match your team\'s effort tracking.',
        icon: '🍃',
        formula: 'Score = Base Points + (Story Points × Multiplier)',
        tips: [
            'Set caps to prevent gaming and ensure fair contribution tracking',
            'Higher Story Point multiplier rewards complex, high-effort work'
        ]
    },
    funding: {
        title: 'Project Allocation',
        description: 'Allocate your environmental impact across reforestation projects. Choose which initiatives your team\'s completed work supports.',
        icon: '🌍',
        tips: [
            'Allocation percentages must total exactly 100%',
            'You can support multiple environmental projects simultaneously'
        ]
    },
    settings: {
        title: 'Organization Settings',
        description: 'Configure conversion rates and privacy settings for your organization. These settings affect how impact is displayed and shared.',
        icon: '⚙️',
        tips: [
            'Higher leaves-per-tree creates more visible progress milestones',
            'Team-only leaderboards protect individual contributor privacy'
        ]
    }
};
