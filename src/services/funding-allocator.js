/**
 * Funding Allocator Service
 * 
 * Allocates trees across selected Afforestation projects
 * per spec section 6.5
 */

/**
 * Allocate trees across funded projects
 * @param {number} totalTrees - Total trees to allocate
 * @param {object} fundingConfig - Tenant's funding configuration
 * @returns {Array<{ projectId: string, trees: number, remainder: number }>}
 */
export function allocateFunding(totalTrees, fundingConfig) {
    const { projectCatalogSelection, allocationPolicy } = fundingConfig || {};

    if (!projectCatalogSelection || projectCatalogSelection.length === 0) {
        console.log('[FundingAllocator] No projects configured');
        return [];
    }

    if (totalTrees < 1) {
        return [];
    }

    const roundingMode = allocationPolicy?.rounding || 'floor';
    const minTrees = allocationPolicy?.minTreesPerProjectPerBatch || 1;
    const carryForward = allocationPolicy?.carryForwardRemainders ?? true;

    const allocations = [];
    let remainingTrees = totalTrees;
    let totalRemainder = 0;

    // Calculate allocations based on percentages
    for (const project of projectCatalogSelection) {
        if (project.allocation?.type !== 'percentage') continue;

        const percentage = project.allocation.value || 0;
        const exactTrees = (totalTrees * percentage) / 100;

        let trees;
        switch (roundingMode) {
            case 'round':
                trees = Math.round(exactTrees);
                break;
            case 'ceil':
                trees = Math.ceil(exactTrees);
                break;
            case 'floor':
            default:
                trees = Math.floor(exactTrees);
        }

        const remainder = exactTrees - trees;

        allocations.push({
            projectId: project.projectId,
            name: project.name,
            percentage,
            exactTrees,
            trees,
            remainder,
            constraints: project.constraints
        });

        totalRemainder += remainder;
    }

    // Distribute remainders to projects with highest percentages
    if (totalRemainder >= 1) {
        const extraTrees = Math.floor(totalRemainder);
        const sortedByPercent = [...allocations].sort((a, b) => b.percentage - a.percentage);

        for (let i = 0; i < extraTrees && i < sortedByPercent.length; i++) {
            const alloc = allocations.find(a => a.projectId === sortedByPercent[i].projectId);
            if (alloc) {
                alloc.trees += 1;
                alloc.remainder -= 1;
            }
        }
    }

    // Filter out allocations below minimum (carry forward for next batch)
    const validAllocations = allocations.filter(alloc => {
        if (alloc.trees < minTrees) {
            console.log(`[FundingAllocator] Project ${alloc.projectId} below minimum (${alloc.trees} < ${minTrees}), ${carryForward ? 'carrying forward' : 'dropping'}`);
            return false;
        }
        return true;
    });

    // Calculate final remainder for carry-forward
    const allocatedTrees = validAllocations.reduce((sum, a) => sum + a.trees, 0);
    const finalRemainder = totalTrees - allocatedTrees;

    return validAllocations.map(alloc => ({
        projectId: alloc.projectId,
        name: alloc.name,
        trees: alloc.trees,
        percentage: alloc.percentage,
        constraints: alloc.constraints
    })).concat(finalRemainder > 0 ? [{
        projectId: '_remainder',
        trees: finalRemainder,
        carryForward: true
    }] : []);
}

/**
 * Validate funding configuration
 * @param {object} fundingConfig 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFundingConfig(fundingConfig) {
    const errors = [];

    if (!fundingConfig?.projectCatalogSelection) {
        errors.push('projectCatalogSelection is required');
        return { valid: false, errors };
    }

    // Validate percentages sum to 100
    const percentageProjects = fundingConfig.projectCatalogSelection.filter(
        p => p.allocation?.type === 'percentage'
    );

    if (percentageProjects.length > 0) {
        const totalPercent = percentageProjects.reduce(
            (sum, p) => sum + (p.allocation.value || 0),
            0
        );

        if (Math.abs(totalPercent - 100) > 0.01) {
            errors.push(`Allocation percentages must sum to 100, got ${totalPercent}`);
        }
    }

    // Validate each project
    for (const project of fundingConfig.projectCatalogSelection) {
        if (!project.projectId) {
            errors.push('Each project must have a projectId');
        }

        if (project.allocation?.type === 'percentage') {
            if (typeof project.allocation.value !== 'number' || project.allocation.value < 0 || project.allocation.value > 100) {
                errors.push(`Invalid percentage for project ${project.projectId}: ${project.allocation.value}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Preview allocation for a given number of trees
 * @param {number} totalTrees 
 * @param {object} fundingConfig 
 * @returns {object}
 */
export function previewAllocation(totalTrees, fundingConfig) {
    const allocations = allocateFunding(totalTrees, fundingConfig);

    const allocated = allocations
        .filter(a => a.projectId !== '_remainder')
        .reduce((sum, a) => sum + a.trees, 0);

    const remainder = allocations.find(a => a.projectId === '_remainder');

    return {
        totalTrees,
        allocatedTrees: allocated,
        remainderTrees: remainder?.trees || 0,
        allocations: allocations.filter(a => a.projectId !== '_remainder'),
        carryForward: remainder?.carryForward || false
    };
}
