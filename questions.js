const QUESTION_BANK = {
  english: [
    {
      question: "Choose the option nearest in meaning to the underlined word: The principal's decision was irrevocable.",
      options: ["temporary", "final", "doubtful", "careless"],
      answer: 1,
      explanation: "Irrevocable means final and cannot be changed."
    },
    {
      question: "Choose the correctly punctuated sentence.",
      options: [
        "Although he was tired, he continued reading.",
        "Although, he was tired he continued reading.",
        "Although he was tired he, continued reading.",
        "Although he was tired: he continued reading."
      ],
      answer: 0,
      explanation: "A dependent clause followed by a main clause takes a comma after the clause."
    },
    {
      question: "From the words lettered A to D, choose the word that best completes the sentence: The team played so well that everybody admired ____.",
      options: ["them", "they", "their", "theirs"],
      answer: 0,
      explanation: "The verb admired takes an object pronoun, so 'them' is correct."
    },
    {
      question: "Choose the option opposite in meaning to: scarce.",
      options: ["plentiful", "small", "dry", "rare"],
      answer: 0,
      explanation: "Scarce means not enough, while plentiful means abundant."
    },
    {
      question: "The expression 'once in a blue moon' means:",
      options: ["at night", "rarely", "during the moonlight", "every month"],
      answer: 1,
      explanation: "It is an idiom meaning something that happens very rarely."
    },
    {
      question: "Choose the word with the same vowel sound as in 'seat'.",
      options: ["sit", "set", "heat", "hat"],
      answer: 2,
      explanation: "'Seat' and 'heat' share the long /iː/ vowel sound."
    },
    {
      question: "Identify the grammatical name given to the underlined expression: What he said surprised everyone.",
      options: ["adverbial clause", "noun clause", "adjectival clause", "phrase"],
      answer: 1,
      explanation: "'What he said' acts as the subject of the sentence, so it is a noun clause."
    },
    {
      question: "Choose the correct spelling.",
      options: ["Occassion", "Occasion", "Ocassion", "Ocaasion"],
      answer: 1,
      explanation: "The correct spelling is 'Occasion'."
    },
    {
      question: "The boy, together with his friends, ____ coming.",
      options: ["are", "were", "is", "have"],
      answer: 2,
      explanation: "The subject is 'The boy', which is singular, so the verb is 'is'."
    },
    {
      question: "Choose the most appropriate title for a passage mainly about the effects of pollution on marine life.",
      options: ["The Ocean at Night", "Threats to Sea Creatures", "Fishing as a Hobby", "A Trip to the Beach"],
      answer: 1,
      explanation: "A good title reflects the central idea of the passage."
    }
  ],
  mathematics: [
    {
      question: "If 3x + 5 = 20, find x.",
      options: ["3", "5", "10", "15"],
      answer: 1,
      explanation: "3x = 15, so x = 5."
    },
    {
      question: "Evaluate 2² + 3².",
      options: ["10", "12", "13", "25"],
      answer: 2,
      explanation: "2² = 4 and 3² = 9. Their sum is 13."
    },
    {
      question: "A trader bought an item for ₦800 and sold it for ₦1,000. What is the profit percentage?",
      options: ["20%", "25%", "40%", "80%"],
      answer: 1,
      explanation: "Profit is ₦200. Profit percentage = 200/800 × 100 = 25%."
    },
    {
      question: "Solve: 4y = 28.",
      options: ["6", "7", "8", "9"],
      answer: 1,
      explanation: "Divide both sides by 4 to get y = 7."
    },
    {
      question: "Find the simple interest on ₦5,000 at 10% per annum for 2 years.",
      options: ["₦500", "₦1,000", "₦1,500", "₦2,000"],
      answer: 1,
      explanation: "SI = PRT/100 = 5000 × 10 × 2 / 100 = ₦1,000."
    },
    {
      question: "If the mean of 4, 6, 8, 10, x is 8, find x.",
      options: ["10", "12", "8", "6"],
      answer: 1,
      explanation: "Total should be 8 × 5 = 40. Known sum is 28. So x = 12."
    },
    {
      question: "Simplify: 3/4 + 1/8.",
      options: ["7/8", "1", "5/8", "3/8"],
      answer: 0,
      explanation: "3/4 = 6/8, and 6/8 + 1/8 = 7/8."
    },
    {
      question: "The angles of a triangle sum up to:",
      options: ["90°", "180°", "270°", "360°"],
      answer: 1,
      explanation: "The interior angles of a triangle add up to 180°."
    },
    {
      question: "Convert 0.75 to a fraction in its lowest term.",
      options: ["1/2", "2/3", "3/4", "4/5"],
      answer: 2,
      explanation: "0.75 = 75/100 = 3/4."
    },
    {
      question: "If Y = C + I and C = 0.8Y, the multiplier is:",
      options: ["2", "3", "4", "5"],
      answer: 3,
      explanation: "Multiplier = 1 / (1 - MPC) = 1 / (1 - 0.8) = 5."
    }
  ],
  biology: [
    {
      question: "The basic unit of life is the:",
      options: ["tissue", "cell", "organ", "system"],
      answer: 1,
      explanation: "The cell is the structural and functional unit of life."
    },
    {
      question: "Photosynthesis occurs mainly in the:",
      options: ["root", "chloroplast", "nucleus", "stem"],
      answer: 1,
      explanation: "Chloroplasts contain chlorophyll, the pigment used in photosynthesis."
    },
    {
      question: "Which of these is a mammal?",
      options: ["Lizard", "Pigeon", "Bat", "Toad"],
      answer: 2,
      explanation: "A bat is a mammal because it gives birth and suckles its young."
    },
    {
      question: "The process by which green plants manufacture food is called:",
      options: ["respiration", "transpiration", "photosynthesis", "diffusion"],
      answer: 2,
      explanation: "Green plants use sunlight, water and carbon dioxide to make food through photosynthesis."
    },
    {
      question: "Blood vessels that carry blood away from the heart are called:",
      options: ["veins", "arteries", "capillaries", "venules"],
      answer: 1,
      explanation: "Arteries carry blood away from the heart."
    },
    {
      question: "Which of these is not a function of the skeleton?",
      options: ["support", "protection", "digestion", "movement"],
      answer: 2,
      explanation: "The skeleton supports, protects and aids movement, but does not digest food."
    },
    {
      question: "A change in gene structure is called:",
      options: ["mutation", "adaptation", "variation", "selection"],
      answer: 0,
      explanation: "A mutation is a sudden heritable change in gene structure."
    },
    {
      question: "The organ responsible for pumping blood round the body is the:",
      options: ["liver", "kidney", "heart", "lung"],
      answer: 2,
      explanation: "The heart pumps blood through the circulatory system."
    },
    {
      question: "The movement of water molecules from a region of high concentration to low concentration through a semi-permeable membrane is:",
      options: ["diffusion", "osmosis", "plasmolysis", "imbibition"],
      answer: 1,
      explanation: "That process is osmosis."
    },
    {
      question: "Which of the following organisms is a decomposer?",
      options: ["Mushroom", "Grasshopper", "Goat", "Eagle"],
      answer: 0,
      explanation: "Fungi such as mushrooms decompose dead organic matter."
    }
  ],
  government: [
    {
      question: "Democracy is best defined as government of the people, by the people and for the people. This definition is credited to:",
      options: ["John Locke", "Abraham Lincoln", "Montesquieu", "Aristotle"],
      answer: 1,
      explanation: "The popular definition is credited to Abraham Lincoln."
    },
    {
      question: "The legislature is primarily responsible for:",
      options: ["executing laws", "interpreting laws", "making laws", "conducting elections"],
      answer: 2,
      explanation: "The legislature makes laws."
    },
    {
      question: "A constitution is said to be rigid when it:",
      options: ["cannot be obeyed", "is difficult to amend", "is unwritten", "is military in nature"],
      answer: 1,
      explanation: "A rigid constitution requires a special process before amendment."
    },
    {
      question: "The doctrine of separation of powers was popularized by:",
      options: ["Karl Marx", "Montesquieu", "Rousseau", "Hobbes"],
      answer: 1,
      explanation: "Montesquieu popularized the doctrine."
    },
    {
      question: "The rule of law implies that:",
      options: ["the law applies equally to all", "leaders are above the law", "judges make all decisions", "only police enforce the law"],
      answer: 0,
      explanation: "Rule of law means equality before the law."
    },
    {
      question: "In a federal system of government, powers are shared between:",
      options: ["political parties", "traditional rulers", "central and regional governments", "judges and police"],
      answer: 2,
      explanation: "Federalism divides powers between central and component units."
    },
    {
      question: "A one-party state is often criticized because it may:",
      options: ["encourage choice", "promote dictatorship", "reduce unity", "remove leadership"],
      answer: 1,
      explanation: "One-party systems can reduce opposition and encourage dictatorship."
    },
    {
      question: "Universal adult suffrage means:",
      options: ["only literates can vote", "all adults can vote", "only men can vote", "only tax payers can vote"],
      answer: 1,
      explanation: "It means all qualified adults have the right to vote."
    },
    {
      question: "An electoral commission is mainly responsible for:",
      options: ["making laws", "interpreting constitutions", "conducting elections", "appointing judges"],
      answer: 2,
      explanation: "Electoral commissions organize and conduct elections."
    },
    {
      question: "The executive arm of government is mainly responsible for:",
      options: ["law making", "policy implementation", "judicial review", "constitutional amendment"],
      answer: 1,
      explanation: "The executive implements government policies and laws."
    }
  ]
};
