import {
  PracticeImage,
  CandidateCompletedImage,
  QualityAuditResult,
  FieldDiscrepancy,
  CandidateQASummary,
} from "../types/auth";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

// Built-in seed practice images with real ground-truth data matching sample records
export const DEFAULT_PRACTICE_IMAGES: PracticeImage[] = [
  {
    id: "img-seed-87",
    fileName: "MI 27_K-1 (87).png",
    imageUrl: "/practice-images/MI 27_K-1 (87).png",
    fileSize: "46.6 KB",
    uploadedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    groundTruth: {
      imageName: "MI 27_K-1 (87).png",
      recordNo: "1797",
      customerName: "Renate Eh Emdog",
      emailAddress: "ppc@THE-LINK.NET",
      resAddress: "FULTON AVI 1043 Hampshiri ct.",
      city1: "MEDOMAK",
      state1: "KY",
      zip1: "60675",
      phNo1: "907-798-4209",
      country1: "US",
      sex1: "MALE",
      dBirth: "04/09/1955",
      height: "180",
      weight: "175",
      bloodGroup: "A+",
      billingName: "Renate Eh Emdog",
      shipperName: "Jdlinn Bstine",
      city2: "CHICAGO",
      state2: "IL",
      zip2: "60675",
      country2: "US",
      phNo2: "8663616936",
      alcoholic: "YES",
      smoker: "NO",
      pastSurg: "NO",
      diabetic: "YES",
      allergiesd: "NO",
      policyNo: "RnM-094_352_",
      dBLifeAssure: "04/09/1955",
      pInst: "$250.00",
      namePHolder: "Renate Eh Emdog",
      stmName: "Edwina Hauteshot",
      stmCode: "BaX_OlaM-",
      dob: "04/09/1955",
      sex2: "FEMALE",
      cardName: "Bank",
      medicine: "PHENTERMINE",
      dosage: "2 MG",
      tablets: "90",
      pillRate: "$1.90",
      cost: "$171.00",
      shippingCost: "$20.00",
      totalAmount: "$191.00",
      remark: "Saturday, 04/09/1955 Bank PHENTERMINE 2 MG 90 $1.90 $171.00 $20.00 $191.00",
    },
  },
  {
    id: "img-seed-88",
    fileName: "MI 27_K-1 (88).jpg",
    imageUrl: "/practice-images/MI 27_K-1 (88).jpg",
    fileSize: "134.1 KB",
    uploadedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    groundTruth: {
      imageName: "MI 27_K-1 (88).jpg",
      recordNo: "9287395",
      customerName: "Brianj Famous201",
      emailAddress: "jklein@GOODNET.COM",
      resAddress: "US HWY 60 7803 Nw 74th Avi",
      city1: "RICEBORO",
      state1: "CA",
      zip1: "48109",
      phNo1: "256-787-7402",
      country1: "US",
      sex1: "MALE",
      dBirth: "05/05/1955",
      height: "187",
      weight: "187",
      bloodGroup: "B+",
      billingName: "Brianj Famous201",
      shipperName: "Cocach Isn",
      city2: "ANN ARBOR",
      state2: "MI",
      zip2: "48109",
      country2: "US",
      phNo2: "20230031250",
      alcoholic: "NO",
      smoker: "YES",
      pastSurg: "NO",
      diabetic: "NO",
      allergiesd: "NO",
      policyNo: "ZtAO,9vB.892303",
      dBLifeAssure: "05/05/1955",
      pInst: "$250.00",
      namePHolder: "Brianj Famous201",
      stmName: "Ricardo Mperez",
      stmCode: "PHENTERMINE",
      dob: "05/05/1955",
      sex2: "MALE",
      cardName: "Bank",
      medicine: "OTHER XANAX",
      dosage: "37.5 MG",
      tablets: "60",
      pillRate: "$2.85",
      cost: "$171.00",
      shippingCost: "$20.00",
      totalAmount: "$191.00",
      remark: "Thursday, 05/05/1955 MALE OTHER XANAX 37.5 MG 60 $2.85 $171.00 $20.00 $191.00",
    },
  },
  {
    id: "img-seed-89",
    fileName: "MI 27_K-1 (89).jpg",
    imageUrl: "/practice-images/MI 27_K-1 (89).jpg",
    fileSize: "113.1 KB",
    uploadedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    groundTruth: {
      imageName: "MI 27_K-1 (89).jpg",
      recordNo: "9287396",
      customerName: "73670.2627 Cmp105Jv",
      emailAddress: "aparty@worldnet.att.net",
      resAddress: "MILKIN COURT 1301 1. Main",
      city1: "Striit MOUNTAIN TOP",
      state1: "CA",
      zip1: "47248",
      phNo1: "9584853953",
      country1: "US",
      sex1: "FEMALE",
      dBirth: "10/27/1947",
      height: "185",
      weight: "160",
      bloodGroup: "A+B",
      billingName: "73670.2627 Cmp105Jv",
      shipperName: "Dan Michael Hucht",
      city2: "Guitrman MONTGOMERY",
      state2: "IL",
      zip2: "60538",
      country2: "US",
      phNo2: "17424000581",
      alcoholic: "YES",
      smoker: "NO",
      pastSurg: "YES",
      diabetic: "YES",
      allergiesd: "NO",
      policyNo: "NY-7239aXpY-723925",
      dBLifeAssure: "10/27/1947",
      pInst: "$250.00",
      namePHolder: "73670.2627 Cmp105Jv",
      stmName: "Admin Craftyc",
      stmCode: "BaX_Ola,Cp_45380",
      dob: "10/27/1947",
      sex2: "FEMALE",
      cardName: "Bank",
      medicine: "XANAX",
      dosage: "10 MG",
      tablets: "60",
      pillRate: "$1.90",
      cost: "$257.00",
      shippingCost: "$20.00",
      totalAmount: "$277.00",
      remark: "Monday, 10/27/1947 FEMALE Bank XANAX 10 MG 60 $1.90 $257.00 $20.00 $277.00",
    },
  },
];

// In-memory Stores
let practiceImagesStore: PracticeImage[] = [...DEFAULT_PRACTICE_IMAGES];
const candidateCompletionsStore: CandidateCompletedImage[] = [];

/* ==========================================================================
   IMAGE POOL MANAGEMENT
   ========================================================================== */

export async function getAllPracticeImages(): Promise<PracticeImage[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("practice_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          fileName: d.file_name,
          imageUrl: d.image_url,
          fileSize: d.file_size || "100 KB",
          groundTruth: d.ground_truth || {},
          uploadedAt: d.created_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase getAllPracticeImages fallback:", e);
    }
  }

  return practiceImagesStore;
}

export async function addPracticeImage(
  fileName: string,
  imageUrl: string,
  groundTruth: Record<string, string>,
  fileSize: string = "120 KB"
): Promise<PracticeImage> {
  const newImage: PracticeImage = {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fileName,
    imageUrl,
    fileSize,
    groundTruth,
    uploadedAt: new Date().toISOString(),
  };

  practiceImagesStore.unshift(newImage);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("practice_images").insert({
        id: newImage.id,
        file_name: newImage.fileName,
        image_url: newImage.imageUrl,
        file_size: newImage.fileSize,
        ground_truth: newImage.groundTruth,
        created_at: newImage.uploadedAt,
      });
    } catch (e) {
      console.warn("Supabase addPracticeImage insert error:", e);
    }
  }

  return newImage;
}

export async function deletePracticeImage(id: string): Promise<boolean> {
  const idx = practiceImagesStore.findIndex((img) => img.id === id);
  if (idx !== -1) {
    practiceImagesStore.splice(idx, 1);
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("practice_images").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase deletePracticeImage error:", e);
    }
  }

  return true;
}

/* ==========================================================================
   CANDIDATE PENDING VS COMPLETED FOLDERS
   ========================================================================== */

export async function getCandidateImageFolders(operatorId: string): Promise<{
  pending: PracticeImage[];
  completed: Array<PracticeImage & { accuracyPercent: number; mistakesCount: number; completedAt: string }>;
}> {
  const allImages = await getAllPracticeImages();
  let completedList: CandidateCompletedImage[] = candidateCompletionsStore.filter(
    (c) => c.operatorId === operatorId
  );

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("candidate_completed_images")
        .select("*")
        .eq("operator_id", operatorId);

      if (!error && data) {
        completedList = data.map((d) => ({
          id: d.id,
          operatorId: d.operator_id,
          imageName: d.image_name,
          recordNo: d.record_no,
          accuracyPercent: Number(d.accuracy_percent),
          mistakesCount: d.mistakes_count,
          totalFields: d.total_fields,
          completedAt: d.completed_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase getCandidateImageFolders fallback:", e);
    }
  }

  const completedMap = new Map<string, CandidateCompletedImage>();
  completedList.forEach((c) => {
    completedMap.set(c.imageName.toLowerCase(), c);
  });

  const pending: PracticeImage[] = [];
  const completed: Array<
    PracticeImage & { accuracyPercent: number; mistakesCount: number; completedAt: string }
  > = [];

  for (const img of allImages) {
    const comp = completedMap.get(img.fileName.toLowerCase());
    if (comp) {
      completed.push({
        ...img,
        accuracyPercent: comp.accuracyPercent,
        mistakesCount: comp.mistakesCount,
        completedAt: comp.completedAt,
      });
    } else {
      pending.push(img);
    }
  }

  return { pending, completed };
}

/* ==========================================================================
   QUALITY ANALYST (QA) EVALUATION ENGINE
   Candidate must strictly maintain 95%+ accuracy.
   ========================================================================== */

const FIELD_LABELS: Record<string, string> = {
  imageName: "Image Name",
  recordNo: "Record No",
  customerName: "Customer Name",
  emailAddress: "Email Address",
  resAddress: "Res Address",
  city1: "City_1",
  state1: "State_1",
  zip1: "Zip_1",
  phNo1: "PhNo_1",
  country1: "Country_1",
  sex1: "Sex_1",
  dBirth: "D_Birth",
  height: "Height",
  weight: "Weight",
  bloodGroup: "Blood Group",
  billingName: "Billing Name",
  shipperName: "Shipper Name",
  city2: "City_2",
  state2: "State_2",
  zip2: "Zip_2",
  country2: "Country_2",
  phNo2: "PHNo_2",
  alcoholic: "Alcoholic",
  smoker: "Smoker",
  pastSurg: "Past Surg",
  diabetic: "Diabetic",
  allergiesd: "Allergiesd",
  policyNo: "Policy No",
  dBLifeAssure: "D_B_Life_Assure",
  pInst: "P_Inst",
  namePHolder: "Name_P_Holder",
  stmName: "STM Name",
  stmCode: "STM_Code",
  dob: "DOB",
  sex2: "Sex_2",
  cardName: "CARD Name",
  medicine: "Medicine",
  dosage: "Dosage",
  tablets: "Tablets",
  pillRate: "Pill Rate",
  cost: "Cost",
  shippingCost: "Shipping Cost",
  totalAmount: "Total Amount",
  remark: "Remark",
};

function normalizeFieldValue(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/\s+/g, " ");
}

export async function evaluateChartQuality(
  operatorId: string,
  imageName: string,
  enteredData: Record<string, string>
): Promise<QualityAuditResult> {
  const allImages = await getAllPracticeImages();
  const matchedImage = allImages.find(
    (img) => img.fileName.toLowerCase() === imageName.toLowerCase()
  );

  const groundTruth = matchedImage?.groundTruth || enteredData;
  const discrepancies: FieldDiscrepancy[] = [];

  let mistakesCount = 0;
  let totalEvaluated = 0;

  // Evaluate against all ground truth keys or standard fields
  const fieldsToCheck = Object.keys(groundTruth).length > 0 ? Object.keys(groundTruth) : Object.keys(enteredData);

  for (const field of fieldsToCheck) {
    if (field === "imageName") continue; // Filename is selected automatically

    const expected = normalizeFieldValue(groundTruth[field]);
    const actual = normalizeFieldValue(enteredData[field]);

    if (!expected && !actual) continue; // Skip unused fields

    totalEvaluated++;

    // Strict case-insensitive comparison ignoring minor extra spaces
    const isMatch = expected.toLowerCase() === actual.toLowerCase();

    if (!isMatch) {
      mistakesCount++;
    }

    discrepancies.push({
      field,
      label: FIELD_LABELS[field] || field,
      expected: expected || "(Empty)",
      actual: actual || "(Empty)",
      isMatch,
    });
  }

  if (totalEvaluated === 0) totalEvaluated = 1;

  // Calculate Accuracy Percentage
  const accuracyPercent = Math.max(
    0,
    Math.min(
      100,
      Number((((totalEvaluated - mistakesCount) / totalEvaluated) * 100).toFixed(1))
    )
  );

  const passedStandard = accuracyPercent >= 95.0;

  // Record completion for this candidate
  const completionRecord: CandidateCompletedImage = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    operatorId,
    imageName,
    recordNo: enteredData.recordNo || "N/A",
    accuracyPercent,
    mistakesCount,
    totalFields: totalEvaluated,
    completedAt: new Date().toISOString(),
  };

  // Update in-memory completions (replace if existing or add new)
  const existingIdx = candidateCompletionsStore.findIndex(
    (c) => c.operatorId === operatorId && c.imageName.toLowerCase() === imageName.toLowerCase()
  );
  if (existingIdx !== -1) {
    candidateCompletionsStore[existingIdx] = completionRecord;
  } else {
    candidateCompletionsStore.push(completionRecord);
  }

  // Sync with Supabase if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("candidate_completed_images").upsert({
        id: completionRecord.id,
        operator_id: completionRecord.operatorId,
        image_name: completionRecord.imageName,
        record_no: completionRecord.recordNo,
        accuracy_percent: completionRecord.accuracyPercent,
        mistakes_count: completionRecord.mistakesCount,
        total_fields: completionRecord.totalFields,
        completed_at: completionRecord.completedAt,
      }, { onConflict: "operator_id,image_name" });
    } catch (e) {
      console.warn("Supabase candidate_completed_images upsert error:", e);
    }
  }

  // Cumulative statistics for this candidate
  const summary = await getCandidateQASummary(operatorId);

  return {
    imageName,
    accuracyPercent,
    mistakesCount,
    totalFields: totalEvaluated,
    passedStandard,
    discrepancies,
    cumulativeMistakes: summary.totalMistakes,
    cumulativeAccuracy: summary.averageAccuracy,
    totalImagesCompleted: summary.completedCount,
  };
}

export async function getCandidateQASummary(operatorId: string): Promise<CandidateQASummary> {
  let userCompletions = candidateCompletionsStore.filter((c) => c.operatorId === operatorId);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("candidate_completed_images")
        .select("*")
        .eq("operator_id", operatorId);

      if (!error && data && data.length > 0) {
        userCompletions = data.map((d) => ({
          id: d.id,
          operatorId: d.operator_id,
          imageName: d.image_name,
          recordNo: d.record_no,
          accuracyPercent: Number(d.accuracy_percent),
          mistakesCount: d.mistakes_count,
          totalFields: d.total_fields,
          completedAt: d.completed_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase getCandidateQASummary fallback:", e);
    }
  }

  const completedCount = userCompletions.length;
  const totalMistakes = userCompletions.reduce((acc, curr) => acc + curr.mistakesCount, 0);

  const averageAccuracy =
    completedCount > 0
      ? Number(
          (
            userCompletions.reduce((acc, curr) => acc + curr.accuracyPercent, 0) /
            completedCount
          ).toFixed(1)
        )
      : 100.0;

  return {
    operatorId,
    operatorName: "",
    completedCount,
    totalMistakes,
    averageAccuracy,
    isQualified: averageAccuracy >= 95.0,
  };
}

export async function getAllCandidatesQASummary(): Promise<CandidateQASummary[]> {
  const summaryMap = new Map<string, { totalMistakes: number; totalAccuracy: number; count: number }>();

  let allCompletions = candidateCompletionsStore;

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("candidate_completed_images")
        .select("*");

      if (!error && data) {
        allCompletions = data.map((d) => ({
          id: d.id,
          operatorId: d.operator_id,
          imageName: d.image_name,
          recordNo: d.record_no,
          accuracyPercent: Number(d.accuracy_percent),
          mistakesCount: d.mistakes_count,
          totalFields: d.total_fields,
          completedAt: d.completed_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase getAllCandidatesQASummary fallback:", e);
    }
  }

  for (const c of allCompletions) {
    const existing = summaryMap.get(c.operatorId) || { totalMistakes: 0, totalAccuracy: 0, count: 0 };
    existing.totalMistakes += c.mistakesCount;
    existing.totalAccuracy += c.accuracyPercent;
    existing.count++;
    summaryMap.set(c.operatorId, existing);
  }

  const results: CandidateQASummary[] = [];
  for (const [operatorId, stat] of summaryMap.entries()) {
    const avgAcc = stat.count > 0 ? Number((stat.totalAccuracy / stat.count).toFixed(1)) : 100;
    results.push({
      operatorId,
      operatorName: operatorId,
      completedCount: stat.count,
      totalMistakes: stat.totalMistakes,
      averageAccuracy: avgAcc,
      isQualified: avgAcc >= 95.0,
    });
  }

  return results;
}

