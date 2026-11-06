import { NextRequest, NextResponse } from "next/server";
import {
  getServerRepairs,
  addServerRepair,
  updateServerRepair,
} from "@/services/serverRepairStore";
import { RepairRequest } from "@/types";
import { getAuthenticatedProfile } from "@/lib/auth/server";

/**
 * /api/farmer/repairs — Comprehensive Farmer Backend API
 *
 * Supports:
 * - GET: Fetch active and past repair requests for farmers
 * - POST: Create and persist new repair requests to backend server
 * - PATCH: Update status, details, or notes of an existing repair
 *
 * Enforces role-based authorization when tokens are provided,
 * while seamlessly supporting authenticated farmer clients.
 */

async function verifyFarmerAuth(): Promise<{
  authorized: boolean;
  phone?: string;
  role?: string;
  errorResponse?: NextResponse;
}> {
  const auth = await getAuthenticatedProfile();
  if (!auth) {
    return { authorized: false, errorResponse: NextResponse.json({ success: false, error: "unauthorized", messageHi: "कृपया पहले किसान खाते से लॉगिन करें।" }, { status: 401 }) };
  }
  if (auth.profile.role !== "farmer") {
    return { authorized: false, errorResponse: NextResponse.json({ success: false, error: "forbidden", messageHi: "यह सेवा केवल किसान खातों के लिए है।" }, { status: 403 }) };
  }
  if (!auth.profile.phone) {
    return { authorized: false, errorResponse: NextResponse.json({ success: false, error: "profile_phone_required" }, { status: 403 }) };
  }
  return { authorized: true, role: "farmer", phone: auth.profile.phone };
}

export async function GET(req: NextRequest) {
  const auth = await verifyFarmerAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const allRepairs = getServerRepairs();
  const phone = auth.phone!;

  // If a specific farmer phone is present, filter for their repairs, or return all if matching
  const filtered = allRepairs.filter((r) => r.farmerPhone?.replace(/\D/g, "") === phone.replace(/\D/g, ""));

  return NextResponse.json({
    success: true,
    role: "farmer",
    authorized: true,
    count: filtered.length,
    repairs: filtered,
    messageHi: "किसान मरम्मत विवरण सफलतापूर्वक लोड हुए।",
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyFarmerAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();

    if (!body.problemDescription && !body.machineId) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_input",
          messageHi: "मशीन और समस्या विवरण आवश्यक है।",
        },
        { status: 400 }
      );
    }

    const uniqueId = body.id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newRepair: RepairRequest = {
      id: uniqueId,
      farmerId: body.farmerId || "farmer-001",
      farmerName: body.farmerName || "रामलाल यादव",
      farmerPhone: auth.phone!,
      machineId: body.machineId || "tractor",
      machineNameHi: body.machineNameHi || "ट्रैक्टर",
      machineIcon: body.machineIcon || "🚜",
      problemDescription: body.problemDescription || "मशीन में समस्या आ रही है",
      inputMethod: body.inputMethod || "voice",
      mediaFileName: body.mediaFileName,
      photoDataUrl: body.photoDataUrl,
      urgency: body.urgency || "today",
      status: "finding_mechanic",
      statusTextHi: "मैकेनिक खोज रहे हैं",
      createdAt: body.createdAt || new Date().toISOString(),
      verificationStatus: "pending",
      syncStatus: "synced",
      isOfflineCreated: false,
      diagnosis: body.diagnosis,
      estimatedCost: body.estimatedCost,
      farmerLocation: body.farmerLocation,
      channel: body.channel || "app",
      callerPhoneNumber: body.callerPhoneNumber,
      recommendedParts: body.recommendedParts,
    };

    const saved = addServerRepair(newRepair);

    return NextResponse.json(
      {
        success: true,
        role: "farmer",
        repair: saved,
        messageHi: "मरम्मत अनुरोध बैकएंड सर्वर पर सुरक्षित दर्ज हो गया।",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "server_error",
        messageHi: "अनुरोध दर्ज करने में त्रुटि आई।",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyFarmerAuth();
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const { repairId, ...updates } = body;

    if (!repairId) {
      return NextResponse.json(
        {
          success: false,
          error: "missing_repair_id",
          messageHi: "मरम्मत अनुरोध आईडी आवश्यक है।",
        },
        { status: 400 }
      );
    }

    const ownedRepair = getServerRepairs().find((repair) => repair.id === repairId && repair.farmerPhone?.replace(/\D/g, "") === auth.phone?.replace(/\D/g, ""));
    if (!ownedRepair) {
      return NextResponse.json({ success: false, error: "not_found", messageHi: "मरम्मत अनुरोध नहीं मिला।" }, { status: 404 });
    }

    const { farmerId: _farmerId, farmerPhone: _farmerPhone, ...safeUpdates } = updates;
    const updated = updateServerRepair(repairId, safeUpdates);
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "not_found",
          messageHi: "मरम्मत अनुरोध नहीं मिला।",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      repair: updated,
      messageHi: "अनुरोध सफलतापूर्वक अपडेट किया गया।",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "server_error",
        messageHi: "अपडेट करने में त्रुटि आई।",
      },
      { status: 500 }
    );
  }
}
