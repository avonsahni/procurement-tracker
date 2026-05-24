import { test, expect } from '@playwright/test';

test.describe('Procurement Tracker E2E Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app home page
    await page.goto('/');
  });

  test('Guest is prompted to log in and cannot access control panel directly', async ({ page }) => {
    // Assert login form is visible
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('button:has-text("Enter Tracking Suite")')).toBeVisible();
  });

  test('User authentication bypass buttons work', async ({ page }) => {
    // Verify viewer bypass button
    await page.getByRole('button', { name: 'Viewer' }).click();
    
    // Header user profile and Sign Out button should be visible
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    
    // Viewer should NOT see settings button
    await expect(page.locator('button:has(svg.lucide-settings)')).not.toBeVisible();
    
    // Sign out
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
  });

  test('Complete project and package lifecycle management (Admin)', async ({ page }) => {
    // Setup dialog listener to accept all confirmation boxes
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // 1. Authenticate as Admin
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    
    // Verify Settings button is visible for admin
    await expect(page.locator('button:has(svg.lucide-settings)')).toBeVisible();

    // 2. Enable Edit Mode
    await page.getByRole('button', { name: 'Enter Edit Mode' }).click();
    await expect(page.getByRole('button', { name: 'Edit Mode ON' })).toBeVisible();

    // 3. Create a New Project
    await page.getByRole('button', { name: 'New Project' }).click();
    
    // Fill Project Details
    await page.getByPlaceholder('e.g. SKYLINE RESIDENCY').fill('E2E TEST TOWER');
    await page.getByPlaceholder('e.g. DLF INFRASTRUCTURE').fill('DLF GROUP');
    await page.getByPlaceholder('50,00,000').fill('7500000');
    
    // Click Initialize
    await page.getByRole('button', { name: 'Initialize Project' }).click();

    // Verify Project in list
    const projectCard = page.locator('div.group:has-text("E2E TEST TOWER")');
    await expect(projectCard).toBeVisible();
    await expect(projectCard.getByText('DLF GROUP')).toBeVisible();
    await expect(projectCard.getByText('₹75,00,000')).toBeVisible();

    // 4. Access Repository
    await projectCard.getByRole('button', { name: 'Access Repository' }).click();
    
    // Verify repository page loaded
    await expect(page.getByRole('heading', { name: 'E2E TEST TOWER' })).toBeVisible();
    await expect(page.getByText('DLF GROUP • ₹75,00,000')).toBeVisible();

    // 5. Add Package
    await page.getByRole('button', { name: 'Add Package' }).click();
    await page.getByPlaceholder('e.g. Electrical Panels').fill('HVAC Chiller Units');
    
    // Dropdowns for Package parameters inside the modal
    const packageModal = page.locator('div.max-w-md').filter({ has: page.getByRole('heading', { name: 'New Package' }) });
    await packageModal.locator('select').first().selectOption('Mechanical');
    await packageModal.locator('select').nth(1).selectOption('Domestic');
    await packageModal.locator('select').nth(2).selectOption('INR');
    
    await page.getByRole('button', { name: 'Create Package' }).click();

    // Verify package card exists
    const packageCard = page.locator('div.rounded-2xl:has-text("HVAC Chiller Units")').first();
    await expect(packageCard).toBeVisible();
    await expect(packageCard.getByText('Mechanical')).toBeVisible();

    // 6. Expand package & verify internal modules
    await packageCard.click();
    await expect(page.getByRole('heading', { name: 'Comparison Matrix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Remarks & Notes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Audit Trail' })).toBeVisible();

    // 7. Add Vendors and Quoted amounts
    const vendorModal = page.locator('div.max-w-sm').filter({ has: page.getByRole('heading', { name: 'Add New Vendor' }) });
    
    // Vendor A
    await page.getByRole('button', { name: 'Add Vendor' }).click();
    await vendorModal.locator('input').nth(0).fill('BlueStar HVAC');
    await vendorModal.locator('input').nth(1).fill('4500000');
    await vendorModal.locator('input').nth(2).fill('4200000');
    await page.getByRole('button', { name: 'Add Entry' }).click();
    
    // Vendor B
    await page.getByRole('button', { name: 'Add Vendor' }).click();
    await vendorModal.locator('input').nth(0).fill('Daikin Commercial');
    await vendorModal.locator('input').nth(1).fill('4800000');
    await vendorModal.locator('input').nth(2).fill('4350000');
    await page.getByRole('button', { name: 'Add Entry' }).click();

    // Verify vendors render in Matrix inputs
    await expect(page.locator('input[value="BlueStar HVAC"]')).toBeVisible();
    await expect(page.locator('input[value="Daikin Commercial"]')).toBeVisible();

    // 8. Progress package stage (RFQ Float -> Technical Negotiation)
    // Stage indexes: 1 = Spec Received, 2 = RFQ Float, 3 = Tech Neg, 4 = Comm Neg, 5 = Award
    await page.getByRole('button', { name: '3' }).click(); // Transition to Tech Negotiation
    
    // 9. Award package to Winner (Select BlueStar HVAC)
    // Find BlueStar row and click Select
    const blueStarRow = page.locator('tr:has(input[value="BlueStar HVAC"])');
    await blueStarRow.getByRole('button', { name: 'Select' }).click();

    // Confirm award popup
    const awardModal = page.locator('div.max-w-md').filter({ has: page.getByRole('heading', { name: 'Award Package' }) });
    await expect(awardModal.locator('input')).toHaveValue('4200000');
    await expect(awardModal.locator('select')).toHaveValue('BlueStar HVAC');
    await page.getByRole('button', { name: 'Confirm Award' }).click();

    // Verify Awarded Status
    await expect(packageCard.getByText('Awarded', { exact: true })).toBeVisible();
    await expect(packageCard.getByText('₹42,00,000').first()).toBeVisible();
    await expect(page.getByText('Winner')).toBeVisible();

    // 10. Post internal Remark
    await page.getByPlaceholder('Add internal remark...').fill('Awarded based on lower revised quote and local service SLA');
    await page.locator('form:has(input[placeholder="Add internal remark..."]) button').click();
    await expect(page.getByText('Awarded based on lower revised quote and local service SLA')).toBeVisible();

    // 11. Mock Upload a Document
    await page.setInputFiles('input[type="file"]', {
      name: 'quotation_matrix.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF_MOCK_CONTENT')
    });
    await expect(page.getByText('quotation_matrix.pdf')).toBeVisible();

    // 12. Cleanup: Delete Package
    await page.locator('button:has(svg.lucide-trash2)').first().click();
    await expect(page.getByText('HVAC Chiller Units')).not.toBeVisible();

    // Go back to Dashboard
    await page.locator('button[title="Back"]').click();
    await expect(page.getByRole('heading', { name: 'Project Portfolio' })).toBeVisible();

    // Delete Project
    await page.locator('div.group:has-text("E2E TEST TOWER")').locator('button:has(svg.lucide-trash2)').click();
    await expect(page.getByRole('heading', { name: 'E2E TEST TOWER' })).not.toBeVisible();
  });
});
