import axios from "axios";
import redisClient from "../../config/redis.js";

class ClinicalTrialsService {
  constructor() {
    this.baseURL =
      process.env.CLINICAL_TRIALS_BASE_URL ||
      "https://clinicaltrials.gov/api/v2";
    this.cacheTTL = parseInt(process.env.CACHE_TTL_MEDIUM) || 1800;

    // Country name mappings
    this.countryMappings = {
      // Americas
      usa: "United States",
      us: "United States",
      "united states": "United States",
      america: "United States",
      canada: "Canada",
      brazil: "Brazil",
      mexico: "Mexico",
      argentina: "Argentina",

      // Europe
      uk: "United Kingdom",
      "united kingdom": "United Kingdom",
      england: "United Kingdom",
      germany: "Germany",
      france: "France",
      italy: "Italy",
      spain: "Spain",
      netherlands: "Netherlands",
      switzerland: "Switzerland",
      sweden: "Sweden",
      norway: "Norway",
      denmark: "Denmark",
      belgium: "Belgium",
      austria: "Austria",
      poland: "Poland",
      czechia: "Czech Republic",

      // Asia
      india: "India",
      china: "China",
      japan: "Japan",
      "south korea": "Korea, Republic of",
      korea: "Korea, Republic of",
      singapore: "Singapore",
      thailand: "Thailand",
      malaysia: "Malaysia",
      indonesia: "Indonesia",
      taiwan: "Taiwan",
      israel: "Israel",
      uae: "United Arab Emirates",
      "saudi arabia": "Saudi Arabia",

      // Oceania
      australia: "Australia",
      "new zealand": "New Zealand",

      // Africa
      "south africa": "South Africa",
      egypt: "Egypt",
      nigeria: "Nigeria",
      kenya: "Kenya",

      // Indian Cities → India
      kolkata: "India",
      mumbai: "India",
      delhi: "India",
      "new delhi": "India",
      bangalore: "India",
      bengaluru: "India",
      chennai: "India",
      hyderabad: "India",
      pune: "India",
      ahmedabad: "India",
      jaipur: "India",
      lucknow: "India",
      "west bengal": "India",
      maharashtra: "India",
      karnataka: "India",
      "tamil nadu": "India",

      // US Cities → United States
      "new york": "United States",
      "los angeles": "United States",
      chicago: "United States",
      houston: "United States",
      phoenix: "United States",
      boston: "United States",
      "san francisco": "United States",

      // Canadian Cities → Canada
      toronto: "Canada",
      vancouver: "Canada",
      montreal: "Canada",
      calgary: "Canada",
      ottawa: "Canada",

      // UK Cities → United Kingdom
      london: "United Kingdom",
      manchester: "United Kingdom",
      birmingham: "United Kingdom",
      edinburgh: "United Kingdom",

      // Australian Cities → Australia
      sydney: "Australia",
      melbourne: "Australia",
      brisbane: "Australia",
      perth: "Australia",

      // Other Cities
      paris: "France",
      berlin: "Germany",
      tokyo: "Japan",
      beijing: "China",
      shanghai: "China",
      seoul: "Korea, Republic of",
    };
  }

  // ✅ Parse location into city and country
  parseLocation(location) {
    if (!location) return { city: null, country: null, raw: null };

    const locationLower = location.toLowerCase().trim();

    // Try to split "City, State" or "City, Country"
    const parts = location.split(",").map((p) => p.trim());

    // Check each part against mappings
    let city = null;
    let country = null;

    for (const part of parts) {
      const partLower = part.toLowerCase().trim();

      if (this.countryMappings[partLower]) {
        if (!country) {
          country = this.countryMappings[partLower];
        }
        // If we already have country, this might be city
        if (!city && country && partLower !== country.toLowerCase()) {
          city = part;
        }
      }
    }

    // If no mapping found, check full string
    if (!country) {
      for (const [key, value] of Object.entries(this.countryMappings)) {
        if (locationLower.includes(key)) {
          country = value;
          // Extract city (first part before comma)
          if (parts.length > 1 && !city) {
            city = parts[0];
          }
          break;
        }
      }
    }

    // Fallback
    if (!country && parts.length >= 2) {
      city = parts[0];
      country = parts[parts.length - 1];
    } else if (!country) {
      country = location;
    }

    console.log(
      `📍 Parsed location: "${location}" → City: "${city || "N/A"}", Country: "${country || "N/A"}"`,
    );

    return { city, country, raw: location };
  }

  // ✅ Main search method with location
  async search(
    condition,
    status = "RECRUITING",
    pageSize = 100,
    location = null,
  ) {
    try {
      const cacheKey = `trials:${condition}:${status}:${pageSize}:${location || "global"}`;

      // ✅ Skip cache for location searches (to get fresh results)
      if (!location) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log("✅ Clinical Trials cache hit");
          return cached;
        }
      }

      console.log(
        `🔍 Searching Clinical Trials: "${condition}"${location ? ` near "${location}"` : ""}`,
      );

      const params = {
        "query.cond": condition,
        "filter.overallStatus": status,
        pageSize: Math.min(pageSize, 100),
        format: "json",
      };

      // ✅ Add location filter to API
      if (location) {
        const parsed = this.parseLocation(location);

        if (parsed.country) {
          params["query.locn"] = parsed.country;
          console.log(`📍 API query.locn: "${parsed.country}"`);
        }
      }

      console.log(`📡 API Params:`, JSON.stringify(params));

      const response = await axios.get(`${this.baseURL}/studies`, {
        params,
        timeout: 15000,
      });

      const studies = response.data.studies || [];
      console.log(
        `🧪 Found ${studies.length} trials${location ? ` (filtered by: ${location})` : ""}`,
      );

      const trials = this.parseTrials(studies);

      // Cache results
      if (trials.length > 0) {
        await redisClient.set(cacheKey, trials, this.cacheTTL);
      }

      return trials;
    } catch (error) {
      console.error("Clinical Trials search error:", error.message);
      return [];
    }
  }

  // ✅ Search with location - main method called by hybrid search
  async searchWithLocation(condition, location = null) {
    if (location) {
      console.log(`\n📍 ===== LOCATION-BASED CLINICAL TRIAL SEARCH =====`);
      console.log(`📍 Condition: "${condition}"`);
      console.log(`📍 Location: "${location}"`);

      const allTrials = [];
      const statuses = ["RECRUITING", "COMPLETED"];

      // Clear cache for fresh location results
      for (const status of statuses) {
        const cacheKey = `trials:${condition}:${status}:50:${location}`;
        await redisClient.del(cacheKey);
      }

      // Search WITH location filter
      for (const status of statuses) {
        const trials = await this.search(condition, status, 50, location);
        allTrials.push(...trials);
      }

      const uniqueLocal = Array.from(
        new Map(allTrials.map((t) => [t.nctId, t])).values(),
      );

      console.log(`📍 Local trials found: ${uniqueLocal.length}`);

      // ✅ Mark local trials with match source
      uniqueLocal.forEach((t) => {
        t.isLocal = true;
        t.matchSource = "location"; // ✅ NEW — tells ranker these are local
      });

      if (uniqueLocal.length >= 5) {
        console.log(`✅ Sufficient local trials — returning local only`);
        console.log(`📍 ===== END LOCATION SEARCH =====\n`);
        return uniqueLocal;
      }

      // ✅ Few or zero local results — fetch global as fallback
      console.log(
        `⚠️  Only ${uniqueLocal.length} local trials — fetching global fallback...`,
      );

      const globalTrials = await this.searchMultipleStatuses(condition);

      // ✅ Mark global trials clearly so ranker knows context
      globalTrials.forEach((t) => {
        t.isLocal = false;
        t.matchSource = "global_fallback"; // ✅ NEW — ranker uses this
      });

      const localIds = new Set(uniqueLocal.map((t) => t.nctId));
      const globalUnique = globalTrials.filter((t) => !localIds.has(t.nctId));

      const merged = [...uniqueLocal, ...globalUnique];

      console.log(
        `✅ Merged: ${uniqueLocal.length} local + ${globalUnique.length} global = ${merged.length} total`,
      );
      console.log(`📍 ===== END LOCATION SEARCH =====\n`);

      return merged;
    }

    // ── No location provided — search globally ────────────────────────────
    console.log(`\n🌍 No location set — searching globally for "${condition}"`);
    console.log(
      `   (Set location in profile or message for local trial results)`,
    );

    const globalTrials = await this.searchMultipleStatuses(condition);

    // Mark all as global so rankingService treats them equally
    globalTrials.forEach((t) => {
      t.isLocal = false;
      t.matchSource = "global";
    });

    console.log(`🌍 Global trials found: ${globalTrials.length}`);
    return globalTrials;
  }

  // Search multiple statuses (no location filter)
  async searchMultipleStatuses(condition) {
    const allTrials = [];
    const statuses = ["RECRUITING", "COMPLETED"];

    for (const status of statuses) {
      const trials = await this.search(condition, status, 50, null);
      allTrials.push(...trials);
    }

    return Array.from(
      new Map(allTrials.map((trial) => [trial.nctId, trial])).values(),
    );
  }

  // ✅ Parse trial data from API response
  parseTrials(studies) {
    return studies
      .map((study) => {
        try {
          const protocolSection = study.protocolSection || {};
          const identificationModule =
            protocolSection.identificationModule || {};
          const statusModule = protocolSection.statusModule || {};
          const eligibilityModule = protocolSection.eligibilityModule || {};
          const contactsLocationsModule =
            protocolSection.contactsLocationsModule || {};
          const conditionsModule = protocolSection.conditionsModule || {};
          const armsInterventionsModule =
            protocolSection.armsInterventionsModule || {};
          const sponsorCollaboratorsModule =
            protocolSection.sponsorCollaboratorsModule || {};
          const designModule = protocolSection.designModule || {};

          const nctId = identificationModule.nctId;
          if (!nctId) return null;

          // Extract locations
          const locations = (contactsLocationsModule.locations || [])
            .map((loc) => {
              const parts = [loc.city, loc.state, loc.country].filter(Boolean);
              return parts.join(", ");
            })
            .filter(Boolean)
            .slice(0, 5); // ← keeps first 5

          // Extract contact info
          const centralContacts = contactsLocationsModule.centralContacts || [];
          const contact = centralContacts[0] || {};

          // Extract interventions
          const interventions = (armsInterventionsModule.interventions || [])
            .map((i) => i.name)
            .filter(Boolean)
            .slice(0, 5);

          return {
            id: nctId,
            nctId,
            title:
              identificationModule.officialTitle ||
              identificationModule.briefTitle ||
              "No title",
            status: statusModule.overallStatus || "Unknown",
            phase: designModule.phases?.[0] || "N/A",
            conditions: conditionsModule.conditions || [],
            interventions,
            eligibility:
              eligibilityModule.eligibilityCriteria || "Not specified",
            locations,
            contact: {
              name: contact.name || null,
              email: contact.email || null,
              phone: contact.phone || null,
            },
            url: `https://clinicaltrials.gov/study/${nctId}`,
            startDate: statusModule.startDateStruct?.date || null,
            completionDate: statusModule.completionDateStruct?.date || null,
            enrollmentCount: designModule.enrollmentInfo?.count || null,
            sponsor: sponsorCollaboratorsModule.leadSponsor?.name || "Unknown",
            relevanceScore: 0,
            isLocal: false,
          };
        } catch (parseError) {
          console.error("Error parsing trial:", parseError.message);
          return null;
        }
      })
      .filter(Boolean); // Remove null entries
  }
}

export default new ClinicalTrialsService();
