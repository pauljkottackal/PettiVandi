import assert from 'node:assert/strict'
import {
  normalizePhoneForWaMe,
  formatKSRTCReceiptMessage,
  formatKSRTCTransitionMessage,
  generateWhatsAppClickToChatUrl,
  generateBookingWhatsAppLinks,
  getLiveTrackingUrl,
  getBaseUrlFromRequest,
  resolveBaseUrl,
} from '../src/lib/whatsappChat'
import { normalizeWhatsAppNumber, notifyBothParties } from '../src/lib/whatsapp'
import { NextRequest } from 'next/server'
import { POST as createParcelPOST } from '../src/app/api/parcels/route'
import { POST as transitionPOST } from '../src/app/api/parcels/[waybillId]/transition/route'
import { GET as getParcelByIdGET } from '../src/app/api/parcels/[waybillId]/route'
import { prisma } from '../src/lib/prisma'

console.log('--- Running WhatsApp Click-to-Chat & Notification Test Suite ---')

async function runAllTests() {
  // -------------------------------------------------------------
  // 1. Phone Normalization for wa.me Links
  // -------------------------------------------------------------
  console.log('1. Testing Phone Normalization for wa.me links...')

  assert.equal(normalizePhoneForWaMe('8281209675'), '918281209675', '10-digit mobile prepends 91')
  assert.equal(normalizePhoneForWaMe('08281209675'), '918281209675', 'Leading 0 is stripped and 91 prepended')
  assert.equal(normalizePhoneForWaMe('+918281209675'), '918281209675', '+ is stripped from +91')
  assert.equal(normalizePhoneForWaMe('+91 82812 09675'), '918281209675', 'Whitespace is removed')
  assert.equal(normalizePhoneForWaMe('+91-82812-09675'), '918281209675', 'Dashes are removed')
  assert.equal(normalizePhoneForWaMe('+91 (828) 120-9675'), '918281209675', 'Parentheses and dashes removed')
  assert.equal(normalizePhoneForWaMe('+91 08281209675'), '918281209675', 'Trunk 0 after country code 91 is stripped')
  assert.equal(normalizePhoneForWaMe('+91 008281209675'), '918281209675', 'Multiple trunk zeroes after 91 stripped')
  assert.equal(normalizePhoneForWaMe('+91 (00) 82812-09675'), '918281209675', 'Multiple parenthesized trunk zeroes stripped')
  assert.equal(normalizePhoneForWaMe('+91 (0) 82812-09675'), '918281209675', 'Parentheses trunk 0 stripped')
  assert.equal(normalizePhoneForWaMe('00918281209675'), '918281209675', '00 prefix stripped')
  assert.equal(normalizePhoneForWaMe('+91/8281209675'), '918281209675', 'Slash removed')
  assert.equal(normalizePhoneForWaMe('whatsapp:+918281209675'), '918281209675', 'whatsapp: prefix stripped')
  assert.equal(normalizePhoneForWaMe('918281209675'), '918281209675', 'Already 12-digit Indian number unchanged')
  assert.equal(normalizePhoneForWaMe('+14155238886'), '14155238886', 'International US number stripped +')
  assert.equal(normalizePhoneForWaMe(''), '', 'Empty string returns empty')
  assert.equal(normalizePhoneForWaMe(null), '', 'Null returns empty')
  assert.equal(normalizePhoneForWaMe(undefined), '', 'Undefined returns empty')
  assert.equal(normalizePhoneForWaMe('N/A'), '', 'Non-digit strings return empty')
  assert.equal(normalizePhoneForWaMe('invalid-phone'), '', 'Invalid letters return empty')
  assert.equal(normalizePhoneForWaMe('12345'), '', 'Too-short numbers return empty')

  // Twilio format normalization check
  assert.equal(normalizeWhatsAppNumber('+919876543210'), 'whatsapp:+919876543210')
  assert.equal(normalizeWhatsAppNumber('9876543210'), 'whatsapp:+919876543210')
  assert.equal(normalizeWhatsAppNumber('+91 08281209675'), 'whatsapp:+918281209675')
  assert.equal(normalizeWhatsAppNumber('N/A'), '', 'Invalid phone returns empty in Twilio format')
  assert.equal(normalizeWhatsAppNumber(null), '', 'Null returns empty in Twilio format')

  console.log('✓ Phone Normalization tests passed.')

  // -------------------------------------------------------------
  // 2. KSRTC Official Receipt Message Formatting
  // -------------------------------------------------------------
  console.log('2. Testing Official KSRTC Receipt Message Formatting...')

  const receiptMessage = formatKSRTCReceiptMessage({
    waybillId: 'PV-2026-TEST99',
    origin: 'Thiruvananthapuram Central',
    destination: 'Kozhikode KSRTC Depot',
    busNumber: 'KL-15-A-1234',
    weightKg: 3.5,
    fare: 115.5,
    baseUrl: 'https://pettivandi.kerala.gov.in',
  })

  assert.ok(receiptMessage.includes('PV-2026-TEST99'), 'Contains Waybill ID')
  assert.ok(receiptMessage.includes('Thiruvananthapuram Central'), 'Contains Origin')
  assert.ok(receiptMessage.includes('Kozhikode KSRTC Depot'), 'Contains Destination')
  assert.ok(receiptMessage.includes('KL-15-A-1234'), 'Contains Bus Number')
  assert.ok(receiptMessage.includes('3.5 kg'), 'Contains Weight')
  assert.ok(receiptMessage.includes('₹115.50'), 'Contains Formatted Fare')
  assert.ok(
    receiptMessage.includes('https://pettivandi.kerala.gov.in/track/PV-2026-TEST99'),
    'Contains Live Tracking URL with /track/<waybillId>'
  )

  console.log('✓ KSRTC Receipt formatting tests passed.')

  // -------------------------------------------------------------
  // 3. Click-to-Chat URL Generation
  // -------------------------------------------------------------
  console.log('3. Testing WhatsApp Click-to-Chat URL Generation...')

  const clickUrl = generateWhatsAppClickToChatUrl('+91 82812 09675', 'Hello KSRTC! Fare: ₹50')
  assert.ok(clickUrl.startsWith('https://wa.me/918281209675?text='), 'Generates wa.me URL with normalized phone')
  assert.ok(!clickUrl.includes(' '), 'URL contains no unencoded spaces')
  assert.ok(!clickUrl.includes('+91'), 'wa.me phone does not contain + sign')
  assert.ok(clickUrl.includes(encodeURIComponent('₹50')), 'Properly URL-encodes special characters like ₹')

  // General share without phone
  const shareUrl = generateWhatsAppClickToChatUrl(null, 'Share tracking update')
  assert.ok(shareUrl.startsWith('https://wa.me/?text='), 'No phone generates general share link')

  console.log('✓ WhatsApp Click-to-Chat URL generation tests passed.')

  // -------------------------------------------------------------
  // 4. Booking WhatsApp Links Generator for Both Parties
  // -------------------------------------------------------------
  console.log('4. Testing Booking WhatsApp Links for Sender & Receiver...')

  const bookingLinks = generateBookingWhatsAppLinks(
    {
      waybillId: 'PV-2026-DISPATCH1',
      senderPhone: '9876543210',
      receiverPhone: '+919876543211',
      weightKg: 2.0,
      calculatedFare: 70,
      trip: {
        departureDepot: 'Ernakulam KSRTC Stand',
        arrivalDepot: 'Thrissur Round',
        busNumber: 'KL-15-X-9988',
        routeName: 'Kochi - Thrissur Fast Passenger',
      },
    },
    'http://localhost:3000'
  )

  assert.equal(bookingLinks.normalizedSenderPhone, '919876543210')
  assert.equal(bookingLinks.normalizedReceiverPhone, '919876543211')
  assert.ok(bookingLinks.sender.startsWith('https://wa.me/919876543210?text='), 'Sender link correctly formatted')
  assert.ok(bookingLinks.receiver.startsWith('https://wa.me/919876543211?text='), 'Receiver link correctly formatted')
  assert.equal(bookingLinks.trackingUrl, 'http://localhost:3000/track/PV-2026-DISPATCH1')
  assert.ok(bookingLinks.message.includes('PV-2026-DISPATCH1'))
  assert.ok(bookingLinks.message.includes('Ernakulam KSRTC Stand'))
  assert.ok(bookingLinks.message.includes('Thrissur Round'))
  assert.ok(bookingLinks.message.includes('KL-15-X-9988'))
  assert.ok(bookingLinks.message.includes('2 kg'))
  assert.ok(bookingLinks.message.includes('₹70.00'))

  console.log('✓ Booking WhatsApp Links generation tests passed.')

  // -------------------------------------------------------------
  // 5. Custody Transition WhatsApp Messages
  // -------------------------------------------------------------
  console.log('5. Testing Custody Transition Messages...')

  const loadedMsg = formatKSRTCTransitionMessage({
    waybillId: 'PV-2026-TRANSIT',
    status: 'LOADED',
    statusLabel: 'Loaded into Hold',
    busNumber: 'KL-15-B-5555',
    routeName: 'Super Fast',
    arrivalDepot: 'Palakkad',
    baseUrl: 'http://localhost:3000',
  })

  assert.ok(loadedMsg.includes('PV-2026-TRANSIT'))
  assert.ok(loadedMsg.includes('KL-15-B-5555'))
  assert.ok(loadedMsg.includes('/track/PV-2026-TRANSIT'))

  const unloadedMsg = formatKSRTCTransitionMessage({
    waybillId: 'PV-2026-TRANSIT',
    status: 'UNLOADED',
    busNumber: 'KL-15-B-5555',
    arrivalDepot: 'Palakkad',
  })

  assert.ok(unloadedMsg.includes('Palakkad'))
  assert.ok(unloadedMsg.includes('Ready for collection'))

  console.log('✓ Custody Transition tests passed.')

  // -------------------------------------------------------------
  // 6. Live Tracking URL Helper & getBaseUrlFromRequest
  // -------------------------------------------------------------
  console.log('6. Testing Live Tracking URL Resolution & getBaseUrlFromRequest...')

  assert.equal(
    getLiveTrackingUrl('PV-2026-1234', 'https://pettivandi.kerala.gov.in/'),
    'https://pettivandi.kerala.gov.in/track/PV-2026-1234'
  )
  assert.equal(
    getLiveTrackingUrl('PV-2026-1234', 'http://localhost:3000'),
    'http://localhost:3000/track/PV-2026-1234'
  )

  // Test getBaseUrlFromRequest with Origin header
  const reqWithOrigin = {
    headers: new Map([['origin', 'https://pettivandi.kerala.gov.in']]),
    nextUrl: { origin: 'http://localhost:3000' },
  }
  assert.equal(
    getBaseUrlFromRequest({ headers: { get: (k) => reqWithOrigin.headers.get(k) || null } }),
    'https://pettivandi.kerala.gov.in'
  )

  // Test getBaseUrlFromRequest with x-forwarded-host
  const reqWithForwarded = {
    headers: new Map([
      ['x-forwarded-host', 'pettivandi-preview.run.app'],
      ['x-forwarded-proto', 'https'],
    ]),
  }
  assert.equal(
    getBaseUrlFromRequest({ headers: { get: (k) => reqWithForwarded.headers.get(k) || null } }),
    'https://pettivandi-preview.run.app'
  )

  // Test multi-tier reverse proxy with comma-separated proxy headers
  const reqWithMultiProxy = {
    headers: new Map([
      ['x-forwarded-host', 'pettivandi.kerala.gov.in, 10.0.0.1'],
      ['x-forwarded-proto', 'https, http'],
    ]),
  }
  assert.equal(
    getBaseUrlFromRequest({ headers: { get: (k) => reqWithMultiProxy.headers.get(k) || null } }),
    'https://pettivandi.kerala.gov.in',
    'Multi-tier proxy headers split correctly without URL corruption'
  )

  // Test fallback URL when phone is invalid ("N/A")
  const invalidPhoneUrl = generateWhatsAppClickToChatUrl('N/A', 'Tracking update')
  assert.ok(
    invalidPhoneUrl.startsWith('https://wa.me/?text='),
    'Invalid phone "N/A" generates general wa.me/?text= link without broken phone in path'
  )

  console.log('✓ Live Tracking URL & Base URL resolution tests passed.')

  // -------------------------------------------------------------
  // 7. Twilio Trial & ContentSid Error Resilience
  // -------------------------------------------------------------
  console.log('7. Testing Twilio Trial & ContentSid Error Classification...')

  function isTrialError(err: { code?: number | string; message?: string }): boolean {
    const errMsg = err?.message ?? ''
    return (
      err?.code === 21654 ||
      err?.code === '21654' ||
      err?.code === 21608 ||
      err?.code === '21608' ||
      err?.code === 63016 ||
      err?.code === '63016' ||
      err?.code === 63015 ||
      err?.code === '63015' ||
      err?.code === 63007 ||
      err?.code === '63007' ||
      err?.code === 572002 ||
      err?.code === '572002' ||
      errMsg.toLowerCase().includes('sandbox') ||
      errMsg.toLowerCase().includes('trial') ||
      errMsg.toLowerCase().includes('unverified') ||
      errMsg.toLowerCase().includes('verified recipient') ||
      errMsg.toLowerCase().includes('contentsid') ||
      errMsg.toLowerCase().includes('content sid') ||
      errMsg.toLowerCase().includes('template')
    )
  }

  assert.ok(isTrialError({ code: 21654 }), 'Twilio code 21654 identified as trial error')
  assert.ok(isTrialError({ code: '21654' }), 'Twilio string code 21654 identified as trial error')
  assert.ok(isTrialError({ code: 21608 }), 'Twilio code 21608 (unverified) identified as trial error')
  assert.ok(isTrialError({ code: 63016 }), 'Twilio code 63016 (freeform window) identified as trial error')
  assert.ok(isTrialError({ code: 63015 }), 'Twilio code 63015 (channel sandbox participant) identified as trial error')
  assert.ok(isTrialError({ code: 63007 }), 'Twilio code 63007 (content sid not found) identified as trial error')
  assert.ok(isTrialError({ code: 572002 }), 'Twilio code 572002 (trial unassigned number) identified as trial error')
  assert.ok(
    isTrialError({ message: 'Twilio Trial Account: number is unverified in sandbox' }),
    'Sandbox message text identified as trial error'
  )
  assert.ok(
    isTrialError({ message: 'No Twilio trial phone number is assigned for messaging to this destination number. Please add the \'to\' number as a verified recipient.' }),
    'Live Twilio 572002 message identified as trial error'
  )
  assert.ok(
    isTrialError({ message: 'A ContentSid is required to send messages to this region' }),
    'ContentSid requirement identified as trial error'
  )
  assert.ok(
    isTrialError({ message: 'Must use pre-approved template outside 24-hr window' }),
    'Template requirement identified as trial error'
  )
  assert.ok(
    !isTrialError({ code: 500, message: 'Internal Server Error' }),
    'General 500 is not misclassified as trial error'
  )

  console.log('✓ Twilio Trial Error Classification tests passed.')

  // -------------------------------------------------------------
  // 8. Same Sender/Receiver Number in notifyBothParties
  // -------------------------------------------------------------
  console.log('8. Testing notifyBothParties with Same Sender/Receiver Number...')

  const sameNumResult = await notifyBothParties('9876543210', '9876543210', 'Test notification')
  assert.equal(sameNumResult.mode, 'click_to_send', 'Mode is click_to_send when unconfigured or trial error')
  assert.equal(sameNumResult.receiver.success, false)
  assert.equal(
    sameNumResult.sender.success,
    false,
    'Sender must NOT falsely report success when same destination fails'
  )
  assert.equal(sameNumResult.receiver.isTrialError, true)
  assert.equal(sameNumResult.sender.isTrialError, true)

  console.log('✓ Same Sender/Receiver Number dispatch tests passed.')

  // -------------------------------------------------------------
  // 9. Base URL Fallback & Sandboxed Origin Protection
  // -------------------------------------------------------------
  console.log('9. Testing resolveBaseUrl fallback & sandboxed origin resilience...')

  assert.equal(resolveBaseUrl(''), 'http://localhost:3000', 'Empty baseUrl resolves to default')
  assert.equal(
    resolveBaseUrl('https://pettivandi.kerala.gov.in/'),
    'https://pettivandi.kerala.gov.in',
    'Trailing slash removed'
  )
  assert.equal(
    resolveBaseUrl('https://pettivandi.kerala.gov.in///'),
    'https://pettivandi.kerala.gov.in',
    'Multiple trailing slashes removed'
  )

  console.log('✓ resolveBaseUrl fallback tests passed.')

  // -------------------------------------------------------------
  // 10. Booking WhatsApp Links with optional fare parameter
  // -------------------------------------------------------------
  console.log('10. Testing Booking WhatsApp Links with optional fare parameter...')
  const linksWithFare = generateBookingWhatsAppLinks({
    waybillId: 'PV-2026-FARETEST',
    weightKg: 3.0,
    fare: 85.5,
    origin: 'Kollam',
    destination: 'Alappuzha',
    busNumber: 'KL-15-9999',
  })

  assert.ok(linksWithFare.message.includes('₹85.50'), 'Calculates formatted fare correctly from input.fare')
  assert.ok(linksWithFare.sender.startsWith('https://wa.me/?text='), 'Handles missing sender phone gracefully')

  console.log('✓ Booking WhatsApp Links optional fare tests passed.')

  // -------------------------------------------------------------
  // 11. End-to-End API Booking Test under Trial Account Restrictions
  // -------------------------------------------------------------
  console.log('11. Testing End-to-End POST /api/parcels with Trial Account Conditions...')

  const existingTrip = await prisma.trip.findFirst()
  assert.ok(existingTrip, 'Existing trip found in test database')

  const testBookingReq = new NextRequest('http://localhost:3000/api/parcels', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
    },
    body: JSON.stringify({
      senderName: 'Test Sender',
      senderPhone: '+919876543210',
      receiverName: 'Test Receiver',
      receiverPhone: '+919876543211',
      weightKg: 2.5,
      description: 'Adversarial Review Test Package',
      tripId: existingTrip.id,
    }),
  })

  const createRes = await createParcelPOST(testBookingReq)
  assert.equal(createRes.status, 201, 'POST /api/parcels returns 201 Created')
  const createdData = await createRes.json()

  assert.ok(createdData.waybillId, 'Returns waybillId')
  assert.ok(createdData.whatsappLinks?.sender, 'Returns sender WhatsApp link')
  assert.ok(createdData.whatsappLinks?.receiver, 'Returns receiver WhatsApp link')
  assert.ok(createdData.whatsappLinks.sender.startsWith('https://wa.me/919876543210?text='))
  assert.ok(createdData.whatsappLinks.receiver.startsWith('https://wa.me/919876543211?text='))
  assert.ok(createdData.whatsappMessage, 'Returns formatted receipt message')
  assert.ok(createdData.whatsappMessage.includes(createdData.waybillId))
  assert.ok(createdData.whatsappDispatch, 'Returns whatsappDispatch metadata')
  assert.equal(createdData.whatsappDispatch.mode, 'click_to_send', 'Default trial mode is click_to_send')

  console.log('✓ End-to-End POST /api/parcels trial test passed.')

  // -------------------------------------------------------------
  // 12. End-to-End API Custody Transition Test
  // -------------------------------------------------------------
  console.log('12. Testing End-to-End POST /api/parcels/[waybillId]/transition...')

  const transitionReq = new NextRequest(
    `http://localhost:3000/api/parcels/${createdData.waybillId}/transition`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        host: 'localhost:3000',
      },
      body: JSON.stringify({
        newStatus: 'LOADED',
        note: 'Loaded for adversarial review test',
      }),
    }
  )

  const transitionRes = await transitionPOST(transitionReq, {
    params: Promise.resolve({ waybillId: createdData.waybillId }),
  })
  assert.equal(transitionRes.status, 200, 'POST /api/parcels/[waybillId]/transition returns 200')
  const transitionData = await transitionRes.json()

  assert.equal(transitionData.status, 'LOADED', 'Status updated to LOADED')
  assert.ok(transitionData.whatsappLinks?.sender, 'Transition returns sender WhatsApp link')
  assert.ok(transitionData.whatsappLinks?.receiver, 'Transition returns receiver WhatsApp link')
  assert.ok(transitionData.whatsappMessage.includes('Loaded into luggage hold'), 'Contains loaded message text')
  assert.ok(transitionData.whatsappMessage.includes(createdData.waybillId), 'Contains waybillId')

  console.log('✓ End-to-End Custody Transition test passed.')

  // -------------------------------------------------------------
  // 13. End-to-End GET /api/parcels/[waybillId] Test
  // -------------------------------------------------------------
  console.log('13. Testing End-to-End GET /api/parcels/[waybillId]...')

  const getByIdReq = new NextRequest(`http://localhost:3000/api/parcels/${createdData.waybillId}`, {
    headers: { host: 'localhost:3000' },
  })
  const getByIdRes = await getParcelByIdGET(getByIdReq, {
    params: Promise.resolve({ waybillId: createdData.waybillId }),
  })
  assert.equal(getByIdRes.status, 200, 'GET returns 200')
  const getByIdData = await getByIdRes.json()
  assert.ok(getByIdData.whatsappLinks?.sender, 'GET by ID returns sender link')
  assert.ok(getByIdData.whatsappLinks?.receiver, 'GET by ID returns receiver link')
  assert.ok(getByIdData.whatsappMessage, 'GET by ID returns message')

  // Cleanup test parcel from database
  await prisma.statusLog.deleteMany({ where: { parcelId: createdData.id } })
  await prisma.parcel.delete({ where: { id: createdData.id } })
  console.log('✓ Cleaned up test parcel from database.')

  console.log('✓ End-to-End GET /api/parcels/[waybillId] test passed.')

  console.log('\n=========================================')
  console.log('ALL WHATSAPP UNIT & E2E TESTS PASSED')
  console.log('=========================================')
}

runAllTests().catch((err) => {
  console.error('Test suite failed:', err)
  process.exit(1)
})
