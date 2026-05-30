# Paper Metadata and Fit Review Checklist

Date: 2026-05-28
Source: `tmp/semble-cache.json` generated at `2026-05-28T23:15:53.149Z`.

Use the two boxes on each line as: `[ ] metadata checked` and `[ ] core contribution fit checked`.

## Count Snapshot

| Category | Papers | Review band |
| --- | ---: | --- |
| semivalues | 26 | large / maybe split or prune |
| data minimization | 19 | large / maybe split or prune |
| influence | 19 | large / maybe split or prune |
| user-generated content | 9 | healthy starter |
| data dividends | 7 | healthy starter |
| fairness via data interventions | 7 | healthy starter |
| unlearning | 7 | healthy starter |
| active learning | 6 | healthy starter |
| membership inference | 6 | healthy starter |
| scaling laws | 6 | healthy starter |
| augmentation and curriculum | 5 | healthy starter |
| causality | 5 | healthy starter |
| collective action | 5 | healthy starter |
| data provenance and source attribution | 5 | healthy starter |
| poisoning | 5 | healthy starter |
| distillation | 4 | small / consider add |
| selection and coresets | 4 | small / consider add |
| training dynamics | 4 | small / consider add |
| meta-learning | 3 | thin / add or merge |
| model collapse | 3 | thin / add or merge |
| reinforcement learning for data valuation | 1 | thin / add or merge |

## Balance Read

The collection now has 21 categories and 149 reference records. A good public-facing starter shelf seems to be about 5-9 papers: enough to show an anchor, a few follow-ons, and one or two bridges without becoming a full survey.

Three shelves are now much larger than the rest:

- `semivalues` (26): probably a survey shelf rather than a starter shelf. Consider splitting into foundations, scalable/approximate valuation, benchmarks/critique, or pruning it to a priority subset for the public page.
- `influence` (19): also survey-like. Consider splitting into classic influence functions, scalable training-data attribution, and critiques/fragility, or marking a priority path.
- `data minimization` (19): newly added and currently broad. Consider splitting into privacy engineering/formal minimization and ML/data-collection minimization, or trimming public display to a core 10-12 after manual fit review.

The thinnest shelves are:

- `reinforcement learning for data valuation` (1): merge into `meta-learning` or `semivalues` unless this becomes a real sub-shelf.
- `meta-learning` (3): either add broad meta-learning anchors or rename/narrow it to example reweighting and learned data curation.
- `model collapse` (3): acceptable as a narrow emerging shelf, but one or two more bridge papers would make it feel intentional.

The 4-paper shelves (`distillation`, `selection and coresets`, `training dynamics`) are close. Adding one strong bridge paper to each would bring them into the healthy starter range.

## Checklist

### active learning (6)

- [ ] metadata [ ] fit `lu2024dataacquisition` - Data Acquisition via Experimental Design for Data Markets (2024, Advances in Neural Information Processing Systems 37)
- [ ] metadata [ ] fit `cohn1996activelearning` - Active Learning with Statistical Models (1996, Journal of Artificial Intelligence Research)
- [ ] metadata [ ] fit `lewis1994sequential` - A Sequential Algorithm for Training Text Classifiers (1994, SIGIR '94)
- [ ] metadata [ ] fit `ash2020badge` - Deep Batch Active Learning by Diverse, Uncertain Gradient Lower Bounds (2020, International Conference on Learning Representations)
- [ ] metadata [ ] fit `seung1992query` - Query by committee (1992, Proceedings of the fifth annual workshop on Computational learning theory)
- [ ] metadata [ ] fit `settles2009activelearning` - Active Learning Literature Survey (2009, University of Wisconsin-Madison, Computer Sciences Technical Report 1648)

### augmentation and curriculum (5)

- [ ] metadata [ ] fit `cubuk2020randaugment` - Randaugment: Practical automated data augmentation with a reduced search space (2020, 2020 IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (CVPRW))
- [ ] metadata [ ] fit `yun2019cutmix` - CutMix: Regularization Strategy to Train Strong Classifiers With Localizable Features (2019, Proceedings of the IEEE/CVF International Conference on Computer Vision)
- [ ] metadata [ ] fit `cubuk2019autoaugment` - AutoAugment: Learning Augmentation Strategies From Data (2019, Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition)
- [ ] metadata [ ] fit `zhang2018mixup` - mixup: Beyond Empirical Risk Minimization (2018, International Conference on Learning Representations)
- [ ] metadata [ ] fit `bengio2009curriculum` - Curriculum learning (2009, Proceedings of the 26th Annual International Conference on Machine Learning)

### causality (5)

- [ ] metadata [ ] fit `qiao2023collaborativecausal` - Collaborative Causal Inference with Fair Incentives (2023, International Conference on Machine Learning)
- [ ] metadata [ ] fit `rubin1974estimating` - Estimating causal effects of treatments in randomized and nonrandomized studies. (1974, Journal of Educational Psychology)
- [ ] metadata [ ] fit `rosenbaum1984subclassification` - Reducing Bias in Observational Studies Using Subclassification on the Propensity Score (1984, Journal of the American Statistical Association)
- [ ] metadata [ ] fit `rosenbaum1983central` - The Central Role of the Propensity Score in Observational Studies for Causal Effects (1983, Biometrika)
- [ ] metadata [ ] fit `pearl2009causality` - Causality (2009, Cambridge University Press)

### collective action (5)

- [ ] metadata [ ] fit `solanki2024promotingautonomy` - Promoting User Data Autonomy During the Dissolution of a Monopolistic Firm (2024, 2nd Workshop on Regulatable ML at NeurIPS 2024)
- [ ] metadata [ ] fit `hardt2023algorithmiccollectiveaction` - Algorithmic Collective Action in Machine Learning (2023, International Conference on Machine Learning)
- [ ] metadata [ ] fit `vincent2021consciousdatacontribution` - Can "Conscious Data Contribution" Help Users to Exert "Data Leverage" Against Technology Companies? (2021, Proceedings of the ACM on Human-Computer Interaction)
- [ ] metadata [ ] fit `vincent2021dataleverage` - Data Leverage: A Framework for Empowering the Public in its Relationship with Technology Companies (2021, FAccT)
- [ ] metadata [ ] fit `vincent2019datastrikes` - "Data Strikes": Evaluating the Effectiveness of a New Form of Collective Action Against Technology Companies (2019, The World Wide Web Conference)

### data dividends (7)

- [ ] metadata [ ] fit `jones2020nonrivalry` - Nonrivalry and the Economics of Data (2020, American Economic Review)
- [ ] metadata [ ] fit `arrietaibarra2018labor` - Should We Treat Data as Labor? Moving Beyond "Free" (2018, AEA Papers and Proceedings)
- [ ] metadata [ ] fit `bearerfriend2025sharingalgorithm` - Sharing the Algorithm: The Tax Solution to Generative AI (2025, Columbia Journal of Tax Law)
- [ ] metadata [ ] fit `wadhwa2020economicimpactdatadividends` - Economic Impact and Feasibility of Data Dividends (2020, Data Catalyst report)
- [ ] metadata [ ] fit `feygin2021datadividendworks` - A Data Dividend That Works: Steps Toward Building an Equitable Data Economy (2021, Berggruen Institute white paper)
- [ ] metadata [ ] fit `vincent2023sharingwinnings` - Sharing the Winnings of AI with Data Dividends: Challenges with "Meritocratic" Data Valuation (2023, EAAMO '23)
- [ ] metadata [ ] fit `vincent2019mappingdividends` - Mapping the Potential and Pitfalls of "Data Dividends" as a Means of Sharing the Profits of Artificial Intelligence (2019, arXiv)

### data minimization (19)

- [ ] metadata [ ] fit `staab2024verticaldataminimization` - From Principle to Practice: Vertical Data Minimization for Machine Learning (2024, IEEE Symposium on Security and Privacy)
- [ ] metadata [ ] fit `pallas2022perquerydataminimization` - Configurable Per-Query Data Minimization for Privacy-Compliant Web APIs (2022, International Conference on Web Engineering)
- [ ] metadata [ ] fit `biega2020personalizationminimization` - Operationalizing the Legal Principle of Data Minimization for Personalization (2020, SIGIR)
- [ ] metadata [ ] fit `pinisetty2018monitoringdataminimisation` - Monitoring Data Minimisation (2018, arXiv)
- [ ] metadata [ ] fit `antignac2017languagebased` - Data Minimisation: A Language-Based Approach (2017, IFIP SEC)
- [ ] metadata [ ] fit `veeningen2014communicationprotocols` - Data Minimisation in Communication Protocols: A Formal Analysis Framework and Application to Identity Management (2014, International Journal of Information Security)
- [ ] metadata [ ] fit `staab2026sokdataminimization` - SoK: Data Minimization in Machine Learning (2026, SaTML)
- [ ] metadata [ ] fit `shaowang2026iotdataminimization` - Algorithmic Data Minimization for Machine Learning over Internet-of-Things Data Streams (2025, PVLDB)
- [ ] metadata [ ] fit `ganesh2024dataminimizationprinciple` - The Data Minimization Principle in Machine Learning (2024, Regulatable ML Workshop at NeurIPS)
- [ ] metadata [ ] fit `yao2024privacyqte` - Privacy-Preserving Quantile Treatment Effect Estimation for Randomized Controlled Trials (2024, Conference on Digital Experimentation)
- [ ] metadata [ ] fit `tran2023inferenceminimization` - Data Minimization at Inference Time (2023, NeurIPS)
- [ ] metadata [ ] fit `witt2023topicsapi` - The Interplay Between Machine Learning and Data Minimization Under the GDPR: The Case of Google's Topics API (2023, International Data Privacy Law)
- [ ] metadata [ ] fit `shanmugam2022limitdatacollection` - Learning to Limit Data Collection via Scaling Laws: A Computational Interpretation for the Legal Principle of Data Minimization (2022, FAccT)
- [ ] metadata [ ] fit `chou2021rctwithoutretention` - Randomized Controlled Trials without Data Retention (2021, Conference on Digital Experimentation)
- [ ] metadata [ ] fit `goldsteen2022dataminimizationgdpr` - Data Minimization for GDPR Compliance in Machine Learning Models (2022, AI and Ethics)
- [ ] metadata [ ] fit `senarath2019dataminimizationmodel` - A Data Minimization Model for Embedding Privacy into Software Systems (2019, Computers & Security)
- [ ] metadata [ ] fit `antignac2014privacyarchitectures` - Privacy Architectures: Reasoning About Data Minimisation and Integrity (2014, Security and Trust Management)
- [ ] metadata [ ] fit `lemetayer2013privacybydesign` - Privacy by Design: A Formal Framework for the Analysis of Architectural Choices (2013, CODASPY)
- [ ] metadata [ ] fit `schaar2010privacybydesign` - Privacy by Design (2010, Identity in the Information Society)

### data provenance and source attribution (5)

- [ ] metadata [ ] fit `lu2025wasa` - WASA: WAtermark-based Source Attribution for Large Language Model-Generated Data (2025, Findings of the Association for Computational Linguistics: ACL 2025)
- [ ] metadata [ ] fit `min2024silo` - SILO Language Models: Isolating Legal Risk In a Nonparametric Datastore (2024, International Conference on Learning Representations)
- [ ] metadata [ ] fit `gebru_datasheets_2018` - Datasheets for Datasets (2021, Communications of the ACM)
- [ ] metadata [ ] fit `dodge2021documenting` - Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus (2021, Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing)
- [ ] metadata [ ] fit `longpre2024dataprovenance` - A large-scale audit of dataset licensing and attribution in AI (2024, Nature Machine Intelligence)

### distillation (4)

- [ ] metadata [ ] fit `hinton2015distilling` - Distilling the Knowledge in a Neural Network (2015, NeurIPS Deep Learning and Representation Learning Workshop)
- [ ] metadata [ ] fit `zhao2023distributionmatching` - Dataset Condensation With Distribution Matching (2023, WACV)
- [ ] metadata [ ] fit `zhao2021gradientmatching` - Dataset Condensation with Gradient Matching (2021, ICLR)
- [ ] metadata [ ] fit `wang2018datasetdistillation` - Dataset Distillation (2018, International Conference on Learning Representations)

### fairness via data interventions (7)

- [ ] metadata [ ] fit `coston2021fairnessgoodmodels` - Characterizing Fairness Over the Set of Good Models Under Selective Labels (2021, International Conference on Machine Learning)
- [ ] metadata [ ] fit `feldman2015disparateimpact` - Certifying and Removing Disparate Impact (2015, Proceedings of the 21th ACM SIGKDD International Conference on Knowledge Discovery and Data Mining)
- [ ] metadata [ ] fit `calmon2017optimizedpreprocessing` - Optimized Pre-Processing for Discrimination Prevention (2017, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `zemel2013fair` - Learning Fair Representations (2013, International Conference on Machine Learning)
- [ ] metadata [ ] fit `kamiran2012preprocessing` - Data preprocessing techniques for classification without discrimination (2012, Knowledge and Information Systems)
- [ ] metadata [ ] fit `gebru_datasheets_2018` - Datasheets for Datasets (2021, Communications of the ACM)
- [ ] metadata [ ] fit `buolamwini_gender_shades_2018` - Gender Shades: Intersectional Accuracy Disparities in Commercial Gender Classification (2018, Conference on Fairness, Accountability and Transparency)

### influence (19)

- [ ] metadata [ ] fit `kreer2025bayesian` - Bayesian Influence Functions for Hessian-Free Data Attribution (2026, ICLR)
- [ ] metadata [ ] fit `rubinstein2025rescaled` - Rescaled Influence Functions: Accurate Data Attribution in High Dimension (2025, The Thirty-ninth Annual Conference on Neural Information Processing Systems)
- [ ] metadata [ ] fit `wang2025hpsensitivity` - Taming Hyperparameter Sensitivity in Data Attribution: Practical Selection Without Costly Retraining (2025, The Thirty-ninth Annual Conference on Neural Information Processing Systems)
- [ ] metadata [ ] fit `mlodozeniec2025dtda` - Distributional Training Data Attribution: What do Influence Functions Sample? (2025, The Thirty-ninth Annual Conference on Neural Information Processing Systems)
- [ ] metadata [ ] fit `covert2024stochasticamortization` - Stochastic Amortization: A Unified Approach to Accelerate Feature and Data Attribution (2024, Advances in Neural Information Processing Systems 37)
- [ ] metadata [ ] fit `bae2024unrolling` - Training Data Attribution via Approximate Unrolling (2024, Advances in Neural Information Processing Systems 37)
- [ ] metadata [ ] fit `kwon2024datainf` - DataInf: Efficiently Estimating Data Influence in LoRA-tuned LLMs and Diffusion Models (2024, International Conference on Learning Representations)
- [ ] metadata [ ] fit `nguyen2023bayesiantda` - A Bayesian Approach To Analysing Training Data Attribution In Deep Learning (2023, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `bae2022question` - If Influence Functions are the Answer, Then What is the Question? (2022, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `karthikeyan2021revisiting` - Revisiting Methods for Finding Influential Examples (2021, arXiv)
- [ ] metadata [ ] fit `basu2020secondorder` - On Second-Order Group Influence Functions for Black-Box Predictions (2020, International Conference on Machine Learning)
- [ ] metadata [ ] fit `koh2019group` - On the Accuracy of Influence Functions for Measuring Group Effects (2019, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `wang2025bettertda` - Better Training Data Attribution via Better Inverse Hessian-Vector Products (2025, NeurIPS)
- [ ] metadata [ ] fit `basu2021fragileinfluence` - Influence Functions in Deep Learning Are Fragile (2021, International Conference on Learning Representations)
- [ ] metadata [ ] fit `ilyas2022datamodels` - Datamodels: Understanding Predictions with Data and Data with Predictions (2022, International Conference on Machine Learning)
- [ ] metadata [ ] fit `yeh2018representer` - Representer Point Selection for Explaining Deep Neural Networks (2018, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `park2023trak` - TRAK: Attributing Model Behavior at Scale (2023, International Conference on Machine Learning)
- [ ] metadata [ ] fit `pruthi2020tracin` - Estimating Training Data Influence by Tracing Gradient Descent (2020, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `koh2017understanding` - Understanding Black-box Predictions via Influence Functions (2017, International Conference on Machine Learning)

### membership inference (6)

- [ ] metadata [ ] fit `yeom2017privacyrisk` - Privacy Risk in Machine Learning: Analyzing the Connection to Overfitting (2018, arXiv.org)
- [ ] metadata [ ] fit `shetty2026nonmembership` - Detecting Non-Membership in LLM Training Data via Rank Correlations (2026, EACL)
- [ ] metadata [ ] fit `dwork2006differentialprivacy` - Differential Privacy (2006, Lecture Notes in Computer Science)
- [ ] metadata [ ] fit `carlini2022membership` - Membership Inference Attacks From First Principles (2022, 2022 IEEE Symposium on Security and Privacy (SP))
- [ ] metadata [ ] fit `shokri2017membership` - Membership Inference Attacks Against Machine Learning Models (2017, 2017 IEEE Symposium on Security and Privacy (SP))
- [ ] metadata [ ] fit `carlini_extracting_training_data_2021` - Extracting Training Data from Large Language Models (2021, 30th USENIX Security Symposium (USENIX Security 21))

### meta-learning (3)

- [ ] metadata [ ] fit `shu2019metaweight` - Meta-Weight-Net: Learning an Explicit Mapping For Sample Weighting (2019, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `ren2018reweight` - Learning to Reweight Examples for Robust Deep Learning (2018, International Conference on Machine Learning)
- [ ] metadata [ ] fit `calian2025datarater` - DataRater: Meta-Learned Dataset Curation (2025, NeurIPS 2025)

### model collapse (3)

- [ ] metadata [ ] fit `shumailov2023curseofrecursion` - The Curse of Recursion: Training on Generated Data Makes Models Forget (2023, arXiv)
- [ ] metadata [ ] fit `alemohammad2023mad` - Self-Consuming Generative Models Go MAD (2023, arXiv.org)
- [ ] metadata [ ] fit `shumailov2024modelcollapse` - AI models collapse when trained on recursively generated data (2024, Nature)

### poisoning (5)

- [ ] metadata [ ] fit `chen2017targetedbackdoor` - Targeted Backdoor Attacks on Deep Learning Systems Using Data Poisoning (2017, arXiv)
- [ ] metadata [ ] fit `khaddaj2023backdoor` - Rethinking Backdoor Attacks (2023, ICML)
- [ ] metadata [ ] fit `steinhardt2017certified` - Certified Defenses for Data Poisoning Attacks (2017, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `gu2017badnets` - BadNets: Evaluating Backdooring Attacks on Deep Neural Networks (2019, IEEE Access)
- [ ] metadata [ ] fit `biggio2012poisoning` - Poisoning Attacks against Support Vector Machines (2012, Proceedings of the 29th International Conference on Machine Learning)

### reinforcement learning for data valuation (1)

- [ ] metadata [ ] fit `yoon2020dvrl` - Data Valuation using Reinforcement Learning (2020, International Conference on Machine Learning)

### scaling laws (6)

- [ ] metadata [ ] fit `nakkiran2021deepdoubledescent` - Deep Double Descent: Where Bigger Models and More Data Hurt (2021, Journal of Statistical Mechanics: Theory and Experiment)
- [ ] metadata [ ] fit `sorscher2022beyondscaling` - Beyond neural scaling laws: beating power law scaling via data pruning (2022, arXiv)
- [ ] metadata [ ] fit `henighan2020autoregressive` - Scaling Laws for Autoregressive Generative Modeling (2020, arXiv.org)
- [ ] metadata [ ] fit `hestness2017scaling` - Deep Learning Scaling is Predictable, Empirically (2017, arXiv.org)
- [ ] metadata [ ] fit `kaplan2020scaling` - Scaling Laws for Neural Language Models (2020, arXiv.org)
- [ ] metadata [ ] fit `hoffmann2022chinchilla` - Training Compute-Optimal Large Language Models (2022, arXiv.org)

### selection and coresets (4)

- [ ] metadata [ ] fit `wang2024rethinking` - Rethinking Data Shapley for Data Selection Tasks: Misleads and Merits (2024, International Conference on Machine Learning)
- [ ] metadata [ ] fit `sener2018coreset` - Active Learning for Convolutional Neural Networks: A Core-Set Approach (2018, International Conference on Learning Representations)
- [ ] metadata [ ] fit `killamsetty2021glister` - GLISTER: Generalization based Data Subset Selection for Efficient and Robust Learning (2021, Proceedings of the AAAI Conference on Artificial Intelligence)
- [ ] metadata [ ] fit `mirzasoleiman2020craig` - Coresets for Data-efficient Training of Machine Learning Models (2020, International Conference on Machine Learning)

### semivalues (26)

- [ ] metadata [ ] fit `diehl2025gameable` - Semivalue-based data valuation is arbitrary and gameable (2025, arXiv)
- [ ] metadata [ ] fit `tamine2026utility` - On the Impact of the Utility in Semivalue-based Data Valuation (2026, ICLR)
- [ ] metadata [ ] fit `wang2025onerun` - Data Shapley in One Training Run (2025, International Conference on Learning Representations)
- [ ] metadata [ ] fit `li2023weightedbanzhaf` - Robust Data Valuation with Weighted Banzhaf Values (2023, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `kessler2025sava` - SAVA: Scalable Learning-Agnostic Data Valuation (2025, ICLR)
- [ ] metadata [ ] fit `ai2025instrumentalvalue` - An Instrumental Value for Data Production and its Application to Data Pricing (2025, International Conference on Machine Learning)
- [ ] metadata [ ] fit `tian2024derdava` - DeRDaVa: Deletion-Robust Data Valuation for Machine Learning (2024, AAAI)
- [ ] metadata [ ] fit `ki2023nomodeltraining` - Data Valuation Without Training of a Model (2023, ICLR)
- [ ] metadata [ ] fit `xu2024datadistributionvaluation` - Data Distribution Valuation (2024, Advances in Neural Information Processing Systems 37)
- [ ] metadata [ ] fit `wang2024rethinking` - Rethinking Data Shapley for Data Selection Tasks: Misleads and Merits (2024, International Conference on Machine Learning)
- [ ] metadata [ ] fit `lin2024distributionallyrobust` - Distributionally Robust Data Valuation (2024, International Conference on Machine Learning)
- [ ] metadata [ ] fit `jahagirdar2024novalidation` - Data Valuation in the Absence of a Reliable Validation Set (2024, Transactions on Machine Learning Research)
- [ ] metadata [ ] fit `liu2023twodshapley` - 2D-Shapley: A Framework for Fragmented Data Valuation (2023, International Conference on Machine Learning)
- [ ] metadata [ ] fit `jiang2023opendataval` - OpenDataVal: a Unified Benchmark for Data Valuation (2023, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `kwon2023dataoob` - Data-OOB: Out-of-bag Estimate as a Simple and Efficient Data Value (2023, International Conference on Machine Learning)
- [ ] metadata [ ] fit `just2023lava` - LAVA: Data Valuation without Pre-Specified Learning Algorithms (2023, ICLR)
- [ ] metadata [ ] fit `xu2022dataappraisal` - Data Appraisal Without Data Sharing (2022, International Conference on Artificial Intelligence and Statistics)
- [ ] metadata [ ] fit `wu2022davinz` - DAVINZ: Data Valuation using Deep Neural Networks at Initialization (2022, International Conference on Machine Learning)
- [ ] metadata [ ] fit `xu2021validationfree` - Validation Free and Replication Robust Volume-based Data Valuation (2021, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `ghorbani2020distributionalshapley` - A Distributional Framework For Data Valuation (2020, International Conference on Machine Learning)
- [ ] metadata [ ] fit `jia2019aistats` - Towards Efficient Data Valuation Based on the Shapley Value (2019, The 22nd International Conference on Artificial Intelligence and Statistics)
- [ ] metadata [ ] fit `jia2019knnvaluation` - Efficient task-specific data valuation for nearest neighbor algorithms (2019, Proceedings of the VLDB Endowment)
- [ ] metadata [ ] fit `shapley1953value` - A Value for n-Person Games (1953, Contributions to the Theory of Games II)
- [ ] metadata [ ] fit `wang2023databanzhaf` - Data Banzhaf: A Robust Data Valuation Framework for Machine Learning (2023, International Conference on Artificial Intelligence and Statistics)
- [ ] metadata [ ] fit `kwon2022betashapley` - Beta Shapley: a Unified and Noise-reduced Data Valuation Framework for Machine Learning (2022, International Conference on Artificial Intelligence and Statistics)
- [ ] metadata [ ] fit `ghorbani2019datashapley` - Data Shapley: Equitable Valuation of Data for Machine Learning (2019, International Conference on Machine Learning)

### training dynamics (4)

- [ ] metadata [ ] fit `ki2023nomodeltraining` - Data Valuation Without Training of a Model (2023, ICLR)
- [ ] metadata [ ] fit `paul2021datadiet` - Deep Learning on a Data Diet: Finding Important Examples Early in Training (2021, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `toneva2019forgetting` - An Empirical Study of Example Forgetting during Deep Neural Network Learning (2019, ICLR)
- [ ] metadata [ ] fit `swayamdipta2020datasetcartography` - Dataset Cartography: Mapping and Diagnosing Datasets with Training Dynamics (2020, Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP))

### unlearning (7)

- [ ] metadata [ ] fit `golatkar2020eternalsunshine` - Eternal Sunshine of the Spotless Net: Selective Forgetting in Deep Networks (2020, 2020 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR))
- [ ] metadata [ ] fit `isonuma2024unlearning` - Unlearning Traces the Influential Training Data of Language Models (2024, Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers))
- [ ] metadata [ ] fit `ginart2019forgetyou` - Making AI Forget You: Data Deletion in Machine Learning (2019, Advances in Neural Information Processing Systems)
- [ ] metadata [ ] fit `cao2015making` - Towards Making Systems Forget with Machine Unlearning (2015, 2015 IEEE Symposium on Security and Privacy)
- [ ] metadata [ ] fit `neel2021descent` - Descent-to-Delete: Gradient-Based Methods for Machine Unlearning (2021, Algorithmic Learning Theory)
- [ ] metadata [ ] fit `guo2020certifiedremoval` - Certified Data Removal from Machine Learning Models (2020, International Conference on Machine Learning)
- [ ] metadata [ ] fit `bourtoule2021sisa` - Machine Unlearning (2021, IEEE Symposium on Security and Privacy (S&P))

### user-generated content (9)

- [ ] metadata [ ] fit `lu2025wasa` - WASA: WAtermark-based Source Attribution for Large Language Model-Generated Data (2025, Findings of the Association for Computational Linguistics: ACL 2025)
- [ ] metadata [ ] fit `min2024silo` - SILO Language Models: Isolating Legal Risk In a Nonparametric Datastore (2024, International Conference on Learning Representations)
- [ ] metadata [ ] fit `schuhmann2022laion5b` - LAION-5B: An open large-scale dataset for training next generation image-text models (2022, NeurIPS 2022 Datasets and Benchmarks)
- [ ] metadata [ ] fit `raffel2020exploring` - Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (2020, Journal of Machine Learning Research)
- [ ] metadata [ ] fit `dodge2021documenting` - Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus (2021, Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing)
- [ ] metadata [ ] fit `brummer2016dbpedia` - DBpedia Abstracts: A Large-Scale, Open, Multilingual NLP Training Corpus (2016, Proceedings of the Tenth International Conference on Language Resources and Evaluation (LREC'16))
- [ ] metadata [ ] fit `guo2020wiki40b` - Wiki-40B: Multilingual Language Model Dataset (2020, Proceedings of the Twelfth Language Resources and Evaluation Conference)
- [ ] metadata [ ] fit `vincent2019ugcinsearch` - Measuring the Importance of User-Generated Content to Search Engines (2019, Proceedings of the International AAAI Conference on Web and Social Media)
- [ ] metadata [ ] fit `longpre2024dataprovenance` - A large-scale audit of dataset licensing and attribution in AI (2024, Nature Machine Intelligence)
