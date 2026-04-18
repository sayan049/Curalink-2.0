// Simple rule-based entity extraction (backup for LLM)
class EntityExtractor {
  constructor() {
    // Medical entity dictionaries
    this.diseases = [
      'diabetes', 'cancer', 'hypertension', 'asthma', 'copd', 'alzheimer',
      'parkinson', 'arthritis', 'depression', 'anxiety', 'stroke', 'heart disease',
      'kidney disease', 'liver disease', 'tuberculosis', 'pneumonia', 'covid-19',
      'influenza', 'hiv', 'aids', 'hepatitis', 'malaria', 'dengue',
    ];

    this.symptoms = [
      'fever', 'cough', 'pain', 'headache', 'nausea', 'vomiting', 'diarrhea',
      'fatigue', 'weakness', 'dizziness', 'shortness of breath', 'chest pain',
      'abdominal pain', 'back pain', 'joint pain', 'muscle pain',
    ];

    this.treatments = [
      'surgery', 'chemotherapy', 'radiation', 'therapy', 'physiotherapy',
      'dialysis', 'transplant', 'immunotherapy', 'hormone therapy',
    ];

    this.medications = [
      'insulin', 'metformin', 'aspirin', 'ibuprofen', 'paracetamol',
      'antibiotics', 'antivirals', 'steroids', 'statins',
    ];
  }

  // Extract entities using pattern matching
  extract(text) {
    const lowerText = text.toLowerCase();

    return {
      diseases: this.findMatches(lowerText, this.diseases),
      symptoms: this.findMatches(lowerText, this.symptoms),
      treatments: this.findMatches(lowerText, this.treatments),
      medications: this.findMatches(lowerText, this.medications),
      procedures: [],
    };
  }

  findMatches(text, dictionary) {
    return dictionary.filter(term => text.includes(term));
  }
}

export default new EntityExtractor();