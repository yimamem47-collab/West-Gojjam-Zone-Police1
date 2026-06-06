/**
 * Sends a message via the server-side proxy to bypass browser restrictions
 * and keep the bot token secure.
 */
export async function sendTelegramMessage(message: string, retries = 2) {
  const url = '/api/telegram';
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          html: true
        })
      });

      if (response.ok) {
        console.log('Telegram message sent via proxy successfully');
        return true;
      }
      
      const errorData = await response.json();
      console.error(`Telegram Proxy error (Attempt ${i + 1}):`, errorData);
      
      // If server returns a parse error, try plain text
      if (errorData.description && errorData.description.includes('can\'t parse entities')) {
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.replace(/<[^>]*>?/gm, ''),
            html: false
          })
        });
        if (retryResponse.ok) return true;
      }
    } catch (error: any) {
      console.error(`Telegram Proxy fetch error (Attempt ${i + 1}):`, error.message || error);
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  
  return false;
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatIncidentMessage(incident: any, type: 'Incident' | 'Report', isUpdate: boolean = false) {
  const emoji = incident.type === 'Crime' ? '🚨' : '🚗';
  const action = isUpdate ? 'Updated' : 'New';
  
  // If it's a citizen report, use the user's requested format
  if (incident.officerId === 'citizen') {
    return `🚨 አዲስ የፖሊስ ጥቆማ፦\n\n<b>Title:</b> ${escapeHtml(incident.title)}\n<b>Type:</b> ${escapeHtml(incident.type)}\n<b>Category:</b> ${escapeHtml(incident.category)}\n<b>Location:</b> ${escapeHtml(incident.location)}\n<b>Description:</b>\n${escapeHtml(incident.description || 'No description provided')}`;
  }

  const header = type === 'Incident' ? `<b>${action} Incident Reported</b>` : `<b>${action} Case Report Submitted</b>`;
  
  return `
${emoji} ${header}
---------------------------
<b>Title:</b> ${escapeHtml(incident.title)}
<b>Status:</b> ${escapeHtml(incident.status)}
<b>Type:</b> ${escapeHtml(incident.type)}
<b>Category:</b> ${escapeHtml(incident.category)}
<b>Location:</b> ${escapeHtml(incident.location)}
<b>Date:</b> ${escapeHtml(incident.date)}
<b>Station:</b> ${escapeHtml(incident.filingStation)}
<b>Officer:</b> ${escapeHtml(incident.recordingOfficerRank || '')} ${escapeHtml(incident.recordingOfficerName || '')}
---------------------------
<b>Description:</b>
${escapeHtml(incident.description || 'No description provided')}
  `.trim();
}

export function formatOfficerMessage(officer: any, isUpdate: boolean = false) {
  const action = isUpdate ? 'Updated' : 'New';
  return `
👮 <b>${action} Officer Profile</b>
---------------------------
<b>Name:</b> ${escapeHtml(officer.name)}
<b>Rank:</b> ${escapeHtml(officer.rank)}
<b>Badge #:</b> ${escapeHtml(officer.badgeNumber)}
<b>Station:</b> ${escapeHtml(officer.station)}
<b>Phone:</b> ${escapeHtml(officer.phone)}
<b>Email:</b> ${escapeHtml(officer.email)}
<b>Status:</b> ${escapeHtml(officer.status)}
  `.trim();
}

export function formatAssignmentMessage(assignment: any, isUpdate: boolean = false) {
  const action = isUpdate ? 'Updated' : 'New';
  return `
📋 <b>${action} Duty Assignment</b>
---------------------------
<b>Title:</b> ${escapeHtml(assignment.title)}
<b>Type:</b> ${escapeHtml(assignment.type)}
<b>Priority:</b> ${escapeHtml(assignment.priority)}
<b>Status:</b> ${escapeHtml(assignment.status)}
<b>Location:</b> ${escapeHtml(assignment.location)}
<b>Officer ID:</b> ${escapeHtml(assignment.officerId)}
<b>Due Date:</b> ${escapeHtml(assignment.dueDate)}
  `.trim();
}
