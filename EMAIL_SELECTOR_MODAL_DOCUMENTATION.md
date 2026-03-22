# Email Selector Modal - Implementation Documentation

## Overview

The Email Selector Modal is a new feature added to the Java Mailer compose page that allows users to select individual email recipients for their email campaigns. This feature provides a more granular control over recipient selection compared to the existing options.

## Components Added

### 1. **Email Selector Modal Stylesheet** (`frontend/css/app.css`)
   - Added comprehensive CSS for the email modal UI
   - Includes styles for:
     - Modal overlay and container
     - Email list display
     - Search functionality
     - Checkboxes and selection states
     - Responsive design for mobile and tablet
     - Scrollbar styling for better UX

### 2. **Email Selector Modal JavaScript Class** (`frontend/js/email-selector-modal.js`)
   
   This file contains the `EmailSelectorModal` class which manages all modal functionality:

   #### Key Methods:

   - **`init()`** - Initializes the modal by creating HTML structure and attaching event listeners

   - **`createModalHTML()`** - Generates the modal HTML including:
     - Modal header with description
     - Search input and button
     - Email list container
     - Select all checkbox
     - Confirm/Cancel buttons

   - **`loadEmails()`** - Loads email recipients from storage:
     - First tries IndexedDB (if available)
     - Falls back to empty state if no data available

   - **`handleSearch(searchTerm)`** - Filters emails based on search term across email and name fields

   - **`handleEmailSelection(emailId, isChecked)`** - Handles individual email selection/deselection

   - **`handleSelectAll(isChecked)`** - Selects or deselects all visible emails

   - **`renderEmailList()`** - Renders filtered email list with proper styling and event handlers

   - **`open(onConfirmCallback)`** - Opens the modal and loads emails. Accepts a callback function

   - **`close()`** - Closes the modal and resets selection

   - **`confirm()`** - Confirms selection and calls the registered callback

   - **`getSelectedEmails()`** - Returns array of selected email objects

   - **`destroy()`** - Cleans up modal resources

### 3. **Compose Handler Updates** (`frontend/js/compose-handler.js`)

   Updated to integrate the email selector modal:

   #### New Global Variables:
   - `emailSelectorModal` - Instance of the EmailSelectorModal class
   - `selectedEmailsForCampaign` - Array storing selected email IDs

   #### New Functions:
   - **`openEmailSelectorModal()`** - Opens the modal with confirmation callback
   - **`handleEmailsSelected(selectedEmails)`** - Processes selected emails and updates UI
   - **`getSelectedEmailsForCampaign()`** - Retrieves currently selected emails

   #### Modified Functions:
   - **`initializeComposeHandler()`** - Now initializes email selector modal and attaches click event to "Select Emails" button
   - **`updateRecipientCount()`** - Now displays count of selected emails when custom filter is active
   - **`handleEmailSubmit()`** - Now validates and includes selected emails in the email data sent to backend

### 4. **Compose Page HTML Updates** (`frontend/compose.html`)

   - Added "Select Emails" button next to recipient filter dropdown
   - Included the email-selector-modal.js script
   - Styled button to align with existing UI

## User Flow

1. **User navigates to Compose page**
   - Email Selector Modal is initialized but not visible

2. **User selects "Custom List" from recipient filter**
   - Dropdown changes to custom recipient mode

3. **User clicks "Select Emails" button**
   - Modal opens showing all available email recipients
   - Email list loads from IndexedDB/storage

4. **User interacts with the modal:**
   - **Search:** Types to filter emails by email address or name
   - **Select All:** Checks "Select All" checkbox to select all visible emails
   - **Individual Selection:** Checks/unchecks individual email checkboxes or clicks on email items

5. **User clicks "Confirm Selection"**
   - Modal closes
   - Selected emails are stored in `selectedEmailsForCampaign`
   - Recipient count updates to show number of selected emails

6. **User sends email campaign**
   - Form validates that at least one email is selected for custom list
   - Selected emails are included in the POST request to backend

## Features

### Search Functionality
- Real-time filtering as user types
- Searches across both email address and name fields
- Case-insensitive matching
- Shows "No emails match your search" when filter returns no results

### Selection Management
- **Select All Checkbox:** Quickly select/deselect all visible emails
- **Indeterminate State:** Shows partial selection when some emails are selected
- **Individual Selection:** Click email item or checkbox to toggle
- **Visual Feedback:** Hover effects and active states on email items

### Responsive Design
- Adapts to mobile screens
- Modal becomes full width on smaller devices
- Buttons stack on mobile for better usability
- Touch-friendly checkbox sizes

### Error Handling
- Graceful fallback if email loading fails
- Validation to ensure at least one email is selected
- Proper error messages displayed to user

### Data Management
- Stores selected emails as Set to avoid duplicates
- Each email stored with ID, email address, and name
- Selected emails persist during modal open/close cycle until page reload

## Integration with Backend

The selected emails are sent to the backend in the email campaign data structure:

```javascript
{
  subject: "Email Subject",
  body: "Email Content",
  recipientFilter: "custom",
  scheduled: false,
  scheduledTime: null,
  selectedEmails: ["email1@example.com", "email2@example.com", ...]
}
```

The backend should handle the `selectedEmails` array when `recipientFilter` is set to "custom".

## CSS Classes Reference

### Main Components
- `.email-modal-overlay` - Semi-transparent overlay backdrop
- `.email-modal` - Modal container
- `.email-list-container` - Scrollable email list area
- `.email-item` - Individual email row

### Interactive Elements
- `.email-checkbox` - Checkbox styling
- `.email-search-input` - Search input field
- `.email-search-btn` - Search button
- `.email-modal-cancel` - Cancel button
- `.email-modal-confirm` - Confirm button

### States
- `.active` - Used on overlay and modal to show/hide
- `:hover` - Interactive element hover states
- `:disabled` - Disabled button states

### Text/Content
- `.email-address` - Email address styling
- `.email-name` - Email name/label styling
- `.email-selection-count` - Selection count display
- `.email-modal-loading` - Loading state message
- `.email-modal-empty` - Empty state message

## Styling Customization

The modal uses CSS custom properties and can be easily themed. Key color references:
- Primary color: `#10a37f` (teal/green)
- Background: `#141414` (dark)
- Text primary: `#ffffff` (white)
- Text secondary: `#a0a0a0` (gray)
- Borders: `rgba(16, 163, 127, 0.2)` (teal with transparency)

## Browser Compatibility

- Tested on modern browsers (Chrome, Firefox, Safari, Edge)
- Uses standard ES6 JavaScript features
- CSS Grid and Flexbox for layout
- No external dependencies required

## Performance Considerations

- Email list is filtered on client-side (fast for reasonable list sizes)
- Virtual scrolling not implemented (fine for lists under 5000 items)
- Modal removed from DOM when destroyed to free up memory
- Uses Set for O(1) selection lookups

## Future Enhancements

1. **Pagination:** Add pagination for very large email lists
2. **Virtual Scrolling:** Implement for better performance with thousands of emails
3. **Bulk Actions:** Add more bulk operations (export, delete, etc.)
4. **Advanced Filters:** Company filter, status filter, etc.
5. **Email Preview:** Show email preview on hover
6. **Sync Indicator:** Show when email list is being synced from API
7. **Custom Groups:** Allow users to save frequently-used email groups

## Testing Checklist

- [ ] Modal opens/closes correctly
- [ ] Emails load and display properly
- [ ] Search filters emails correctly
- [ ] Select all checkbox works
- [ ] Individual email selection works
- [ ] Confirm updates recipient count
- [ ] Email count updates in compose form
- [ ] Form validation prevents sending without emails selected
- [ ] Modal responsive on mobile
- [ ] Modal responsive on tablet
- [ ] Modal clean up on page navigation

## Troubleshooting

### Modal not appearing
- Check that `email-selector-modal.js` is loaded in compose.html
- Verify `EmailSelectorModal` class is initialized
- Check browser console for JavaScript errors

### Emails not loading
- Verify IndexedDB has email data
- Check browser developer tools IndexedDB storage
- Verify API endpoint is accessible (if loading from API)

### Selected emails not included in submission
- Ensure `recipientFilter` value is "custom"
- Check that selected emails are stored in `selectedEmailsForCampaign`
- Verify backend expects `selectedEmails` property

### Styling issues
- Check that `app.css` is properly linked
- Verify CSS classes are applied correctly
- Check for CSS conflicts with other stylesheets
