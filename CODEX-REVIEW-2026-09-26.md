# Codex takeover review — 2026-09-26

_Model: gpt-6-astra, reasoning effort high, read-only sandbox, run non-interactively from this repo at commit 86d516b. Brief: review HANDOFF.md, SPIKE-STACK.md, AGENTS.md and the archive branch, then say what it would change about what has been done, what it would do next as if owning the work, and what is wrong. Output below is unedited; Claude Code's response to it is recorded in HANDOFF.md ledger row 28._

**I would not approve SPIKE-STACK.md as written.** The stack is a plausible candidate. The proposal overstates what has been verified, gives a false architectural justification for its captioning choice, and cannot establish the data floor it promises.

I read the requested files and archive source, then checked upstream code, licences, legislation and litigation records. I did not change files, run training or reproduce the reported deployment tests.

**A. WHAT I WOULD CHANGE ABOUT WHAT HAS BEEN DONE**

1. **The archive still exposes more than a public portfolio needs.**

   On `archive/hackathon-public`, `src/app/api/tracks/[id]/route.ts:45–58` uses the service-role client to select and return the **entire creator row**. Blocking `/api/debug` does not block this endpoint. The shared database schema includes wallet/nullifier fields and, after migration 004, email. The track lookup also lacks a published-status restriction.

   This is a source-confirmed exposure path; I have not verified which populated fields the live deployment currently returns.

   **Fix:** serve an explicit, sanitized archive snapshot, preferably without live database credentials. If retaining APIs, allowlist public fields and published records. Remove unnecessary endpoints and use database credentials incapable of writing.

   The proxy and omitted paid-provider keys are useful, but they are **not two independent protections against database writes**: the deployment retains the Supabase service-role key. The original production app also remains connected to that database with its old endpoints. Securing one hostname does not secure the shared data.

2. **Stop making backup depend on the PNG walkthrough.**

   [HANDOFF.md:155](/Users/edwinhidalgo/Documents/verified-fan-app/HANDOFF.md:155) blocks backup behind a UI test. My September plan prescribed that sequence. **It was wrong.** A backup does not certify a release.

   **Fix:** inspect outgoing history for secrets and confidential material, then back up the branches and both historical tags immediately. Keep the PNG walkthrough as an integration check. Do not let it block preservation or isolated model experimentation.

3. **Keep HANDOFF.md, but remove its unsupported authority claims.**

   The ledger and stale-document inventory are good.

   Concrete corrections:

   - Actual HEAD is `86d516b`, not `d4b85d8`; `main` is seven commits behind this branch, not three.
   - Row 7 says memory is verified; §3 and SPIKE-STACK’s open questions say it is unmeasured.
   - §8 says find an artist in parallel; the approved Track A/B direction says no approach until the demonstration works.
   - “Current and trustworthy” includes the old brief, which still contains the retracted universal-erasure claim, overstated demand inference and obsolete repository state.
   - Important operative documents remain outside the repository despite the repository-as-source-of-truth rule.

   **Fix:** distinguish *measured here*, *reported upstream*, *proposed* and *unknown*. Attach evidence and dates to consequential claims. Bring the operative specification into the repository and mark earlier plans historical.

4. **The archive version correction was right; the verification claim remains too broad.**

   [HANDOFF.md:239](/Users/edwinhidalgo/Documents/verified-fan-app/HANDOFF.md:239) reports identical extracted text. That establishes text parity—not visual parity, working playback, correct cover art or complete historical fidelity.

   **Fix:** retain screenshots at fixed viewport sizes, playback checks and sanitized data fixtures. Show a historical/read-only notice before users encounter disabled operations. Compare against a retained reference, not indefinitely against another live deployment.

   Similarly, Story IDs, transaction hashes and resolving IPFS metadata are evidence worth preserving. They do not alone establish successful on-chain registration. Verify transaction success, network, registration events and asset linkage. My earlier instruction to label the whole path mocked was also too strong.

5. **Keep the Track A/B separation, but remove the second generation-engine project from the critical path.**

   Separating permission infrastructure from model quality is sensible. Integrating `everything-hums` introduces another engine, asset licence chain, nondeterminism problem and revocation boundary without answering whether artist adapters produce useful music.

   **Fix:** build Track A against a tiny generation interface and explicitly labelled test grants; connect the actual adapter worker when Track B passes. Keep the palette route as an optional demonstration only if it is already trivial to reuse.

   Under the current no-artist rule, the two-week result is a **technical feasibility demonstration**. It cannot simultaneously satisfy the original contract’s explicitly consented artist-adapter demonstration. Record that scope change openly.

**B. WHAT I WOULD DO NEXT IF I OWNED THIS**

1. **Back up the work and close the archive’s unnecessary data exposure.** These protect existing work and credibility before creating new obligations. Do not put confidential spike data in the shared public audio bucket.

2. **Replace the approval document with a bounded feasibility authorization.** Specify exact upstream revisions, checkpoint IDs, applicable terms, permitted data, one experiment, cash allocation and start/end dates. Start the clock when spike implementation or model feasibility work starts—not only when an optimizer finally runs.

3. **Resolve the data supply before substantial training.** Identify actual files, usable minutes, independent songs, licences, instrumental/vocal status and held-out songs. “An FMA artist with enough catalogue” is currently a dependency, not a dataset. Use only outputs demonstrably generated by Edwin for any synthetic smoke test; the handoff explicitly says 29 legacy tracks belong to other users.

4. **Measure one complete local cycle.** Pre-encode, train briefly, save, reload and generate with an adapter. Record process memory, MLX memory, swap, seconds per step and generation time at the intended clip duration. Small can test plumbing; assess the intended quality model before interpreting a quality failure. Stop after a bounded feasibility gate if the remaining work cannot fit.

5. **Run one useful adapter before funding the whole ladder.** Establish whether it improves over the unchanged inference model on fixed, content-only prompts. If it produces obvious copying, poor audio or no useful difference, investigate that before multiplying experiments.

6. **If that works, run a small exploratory ladder with a locked final evaluation.** Keep one model and training recipe across conditions. Separate checkpoint-selection material from final test prompts and references. Report preference, quality, prompt adherence and copying separately. A negative small study is inconclusive about the true minimum.

7. **Connect permission checks, execution receipts and revocation to that same worker.** Test denied requests, queued work, loaded adapters and output delivery. Finish with retained outputs, failures, costs, limitations and a decision. Approach an artist afterward, consistent with Edwin’s instruction, under a separately explicit consent-validation milestone.

I would **not** spend this spike on rank 32, multi-artist stacking, bespoke mastering, a full palette-engine integration, a comprehensive captioning comparison or consumer-app polish. I would not reassign other users’ tracks to Edwin as housekeeping. I would not treat Replicate as a ready fallback merely because the app already calls its generation API.

**C. WHAT IS WRONG**

1. **The memory claim crosses runtimes without evidence.**

   [SPIKE-STACK.md:74](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:74) copies genuine upstream figures but changes their meaning. The ~6.5/~5.5 GB table appears under a requirement for a **CUDA GPU**. It is not a benchmark of MLX training on a 16 GB M4. [Upstream training guide](https://github.com/Stability-AI/stable-audio-3/blob/main/docs/workflows/lora.md)

   The current MLX trainer loads the base in **FP16**; it does not expose the quoted `--base_precision` option. Its reported peak counter is reset after loading, and optional demonstrations can load additional model components. Measure the whole process, not just one counter. [MLX trainer](https://raw.githubusercontent.com/Stability-AI/stable-audio-3/main/optimized/mlx/scripts/lora_train_mlx.py)

   Unified memory also serves macOS and other applications. Batch size, duration, activations, optimizer state and caches matter.

   **Correction:** “MLX training is supported upstream; whether the selected configuration fits this machine with acceptable throughput is unverified.” It may fit. “Fits with headroom” and “memory we do not need” are unjustified.

2. **The licence conclusion is directionally reasonable; “the only bar” is false.**

   [SPIKE-STACK.md:57](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:57) omits commercial registration, attribution/notice obligations, acceptable-use restrictions, termination provisions and the revenue test’s inclusion of affiliates and revenue unrelated to ekos. Output ownership is qualified by applicable law and is only **as between you and Stability**; it does not clear third-party rights. [Community License](https://stability.ai/community-license-agreement)

   The LoRA quotation comes from Stability’s FAQ, not the agreement text. It supports adapter use but does not replace reviewing the agreement. [Licensing FAQ](https://stability.ai/license)

   SA3 also incorporates T5Gemma under separate Gemma terms. Pin the terms for the exact base, inference checkpoint and redistributed components. [Model card](https://huggingface.co/stabilityai/stable-audio-3-medium)

   **Correction:** “Commercial adapter use appears available under specified conditions.” Not “licence clear, only one restriction.”

3. **“Edwin owns the catalogue; zero licensing exposure” is unsupported.**

   SA3’s licence does not establish the terms governing earlier SA2.5 outputs delivered through Replicate. Check the applicable service/model terms and actual authorship of each selected output. Even contractual permission to use an output does not guarantee copyright protection or absence of third-party claims.

   More immediately, HANDOFF’s own row 9 contradicts treating the entire ekos catalogue as Edwin’s. Administrative control of storage is not ownership.

4. **The Jamendo premise is stale, and the proposed distinction is legally imprecise.**

   Jamendo filed a voluntary dismissal on **August 13, 2026**. Reporting identifies it as without prejudice. Calling that action “currently suing” or “live” in the September proposal is wrong on the available record. Dismissal is not a merits ruling that training was lawful. [Docket](https://dockets.justia.com/docket/massachusetts/madce/1%3A2026cv12966/302906), [dismissal report](https://www.musicbusinessworldwide.com/jamendo-drops-its-copyright-infringement-lawsuit-against-suno-six-weeks-after-filing-it/)

   The allegations involved noncommercial licence restrictions, compilation rights and website terms. That is not interchangeable with compliant use of an individual CC-BY recording.

   Creative Commons expressly says its licences can authorize uses involving new technology, including AI, subject to their conditions. **AI-specific wording is ekos’s stronger consent standard, not a universal prerequisite for copyright permission.** [CC’s AI guidance](https://creativecommons.org/faq/#artificial-intelligence-and-cc-licenses)

   Rejecting Jamendo for reputational reasons is a defensible policy choice. Switching to FMA does not, by itself, resolve the consent-brand problem.

5. **“Commercially usable FMA” is not adequate clearance or adequate experimental data.**

   FMA’s metadata licence is distinct from each recording’s licence. The original dataset contains mixed licences; its common small/medium/large packages contain 30-second excerpts, while the full package contains untrimmed tracks. These are recordings, not production stems. [FMA repository](https://github.com/mdeff/fma)

   A commercial-use filter can still include ShareAlike or NoDerivatives conditions. Check exact licence versions, source terms, attribution, modifications, composition/master rights and third-party samples. CC-BY does not broadly license publicity rights or imply endorsement. [CC-BY legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en)

   The proposal names neither the claimed published configuration nor a qualifying artist. That deserves an **unresolved** label.

   The full-rate correction is right. But 16 kHz data creates a bandwidth mismatch and possible fidelity bias; it does not prove every adapted output will have a hard bandwidth ceiling.

6. **Track A’s preview analysis is not cleared by discarding the audio.**

   The proposal rejects iTunes previews for training while treating palette extraction as clean. Apple’s published Search API terms restrict previews to promotional purposes, prohibit independent entertainment use and restrict downloading/caching. Local processing and a small derived JSON do not establish compliance. [Apple’s terms](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html)

   Use an owned or appropriately licensed fixture. Also audit the recorded voice bank’s rights: selecting a recording from a bank introduces rights obligations of its own.

7. **The trigger-token rationale is technically wrong.**

   [SPIKE-STACK.md:143](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:143) confuses **conditioning** with **authorization**.

   The server can check the grant, load the adapter, inject a token internally and record the actual execution. A user typing that token does not load an absent adapter. Revocation works by disabling the controlled execution path either way.

   The proposed trainer freezes T5Gemma and learns adapter parameters. This is not a learned-token-embedding experiment; the assertion that all artist information squeezes through one embedding is false for this pipeline. [Trainer implementation](https://raw.githubusercontent.com/Stability-AI/stable-audio-3/main/optimized/mlx/scripts/lora_train_mlx.py)

   Neither method guarantees selectivity, freedom from incidental-feature learning or artist recognition. Omitting names also does not prevent voice imitation.

   **Fix:** content-only captions are a reasonable initial engineering choice. Delete the ideological justification and misleading comparison table. A trigger-token comparison is optional empirical work, not a test of whether consent architecture remains valid.

8. **The prompt controls do not isolate the claimed effect.**

   [SPIKE-STACK.md:177](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:177) says any base response to an artist’s name confounds every adapter result. Incorrect: a matched base control lets you measure incremental adapter effects even when the base has relevant capabilities.

   The main comparison should hold prompt, seed, duration, sampler, guidance and inference checkpoint constant, changing only adapter condition. “Unmodified base” must distinguish the training BASE checkpoint from the deployed ARC inference checkpoint.

   One different artist’s name cannot establish what **any name** does. It introduces different genre, familiarity and token effects. Missing cells further limit interactions.

   Use the same content prompt with/without the target name, plus a neutral invented label if name effects matter. Keep name routing as a separate policy test. It does not need to consume half the quality experiment.

9. **The data-floor experiment has neither a clean quantity variable nor adequate power.**

   [SPIKE-STACK.md:205](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:205) calls nested datasets a “pure quantity ladder.” Nesting also changes repertoire, instrumentation, production and caption coverage. One arbitrarily chosen song may be unusually representative—or unusually unrepresentative.

   Equal steps give smaller datasets more repetitions per example; equal epochs give larger datasets more optimization steps. Choose which question you are answering and record both training exposure and unique audio. Overlapping crops and stems do not create independent songs.

   The ~20–50-clip guidance is a starting recommendation, **not an established artist-recognition threshold**. It cannot simultaneously be treated as a proven floor and the quantity this experiment will discover.

   As written, the matrix could mean only two outputs per cell. Two unanimous independent forced-choice results have chance probability **25%**. Three listeners judging the same outputs do not turn them into six independent generations.

   Even with **16 independent pairs**, a one-sided 5% binomial test requiring at least 12 wins has only about **45% power** when the true preference rate is 70%. Prompt clustering and comparisons across several conditions make inference harder.

   **Correction:** this can identify a promising configuration for one selected dataset. It cannot reliably locate a minimum, and failure cannot establish that a particular data size is insufficient. Three differently sized adapters are not three replications.

10. **Checkpoint selection can manufacture the reported winner.**

    Eight checkpoints per condition are eight opportunities to select noise. Selecting the checkpoint, strength or caption strategy on the final listening material contaminates the final evaluation.

    Saving checkpoints is cheap; evaluating them is not. Eight checkpoints × three adapters × eight prompts × two seeds means **384 adapted generations**, before base controls, trigger experiments and reruns.

    **Fix:** use a small development set for checkpoint selection, freeze the selected configuration, then evaluate untouched prompts/seeds and held-out songs. Preserve unsuccessful outputs.

    “DoRA ≥ LoRA” is not a universal guarantee, and learning rate is not intrinsically the least informative variable. Rank 16 and `1e-4` are defaults worth trying, not established findings.

11. **The listening and memorization tests need different questions.**

    “Which is by the same artist?” falsely suggests authorship. Ask which better matches specified characteristics of held-out references. Measure absolute usefulness separately: an adapter can beat a poor base and still be unusable.

    Include same-genre distractors and real same-artist references as listening controls. Otherwise the panel may recognize instrumentation rather than artist-specific characteristics. Two or three musicians supply useful judgments; they do not establish broad artist acceptance.

    Baseline similarity alone does not validate a copying detector. Test known copied excerpts, transformed copies and unrelated same-genre negatives. Search across training tracks using local alignment, then review flagged passages. A detector that misses a deliberately inserted copy cannot support a clean result.

    Loudness-match comparisons. Defer bespoke mastering: it introduces another intervention and more evaluator work.

12. **Revocation is about control over execution and copies, not artifact size.**

    [SPIKE-STACK.md:248](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:248) says delete the grant. That destroys historical authorization evidence.

    **Fix:** retain immutable grant versions, mark revocation with an effective timestamp and deny subsequent authorized use. Check at worker execution and define what happens if revocation arrives before output delivery.

    An adapter may already be merged into an in-memory model. Deleting its file does not unload that model. Test pristine → adapted → pristine execution, queued jobs and concurrent requests.

    A browser-delivered 1 KB palette can also be copied and retained. Smallness does not make revocation stronger. State that revocation stops ekos-controlled use; it cannot recall distributed assets.

    Receipts should record worker-observed execution, including model/adapter hashes, inference settings, grant version, outcome and output hash. A receipt can document a nondeterministic execution without reproducing it bit for bit. “Cannot reproduce itself, therefore not a receipt” is false.

13. **The legal schema is oversold.**

    AB 2602 does not categorically void every insufficiently specific digital-replica grant. It addresses particular personal/professional-services provisions, defined voice/likeness replicas and multiple conditions, including representation requirements and an exception. It does not mandate database booleans or generally regulate instrumental style resemblance. [Enacted text](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2602)

    Keep pathway permissions and specific descriptions because they improve consent. Do not present them as statutory compliance achieved by schema.

    Likewise, UMG’s announcement says **more than 24 issued and allowed patents**, not 24+ issued patents. Avoiding payments does not establish freedom to operate for generation or authorization. Deferring counsel is a scope decision with residual risk, not a legal safe harbour. [UMG announcement](https://www.universalmusic.com/music-ip-holdings-unveils-groundbreaking-patent-portfolio-and-license-for-ai-music-creation-with-udio-and-grai-as-first-adopters/)

14. **The budget and clock do not reconcile.**

    [SPIKE-STACK.md:216](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:216) redirects GPU money while keeping the full $60 fallback reserve. That leaves $40 for everything else until the reserve is released. No listener fees, evaluation hours or revised totals are specified.

    Moving the artist honorarium after the spike also moves the original artist-validation outcome after the spike.

    Approval supposedly authorizes day-one feasibility but not starting the clock, while the first training run starts it. Track A could consume substantial implementation time outside this accounting.

    **Fix:** one dated 14-day implementation window, explicit cash allocations, measured labor and throughput, and a clearly named outcome: **technical feasibility now; genuine consent validation later unless a real grant is actually obtained.**
tokens used
143,057
**I would not approve SPIKE-STACK.md as written.** The stack is a plausible candidate. The proposal overstates what has been verified, gives a false architectural justification for its captioning choice, and cannot establish the data floor it promises.

I read the requested files and archive source, then checked upstream code, licences, legislation and litigation records. I did not change files, run training or reproduce the reported deployment tests.

**A. WHAT I WOULD CHANGE ABOUT WHAT HAS BEEN DONE**

1. **The archive still exposes more than a public portfolio needs.**

   On `archive/hackathon-public`, `src/app/api/tracks/[id]/route.ts:45–58` uses the service-role client to select and return the **entire creator row**. Blocking `/api/debug` does not block this endpoint. The shared database schema includes wallet/nullifier fields and, after migration 004, email. The track lookup also lacks a published-status restriction.

   This is a source-confirmed exposure path; I have not verified which populated fields the live deployment currently returns.

   **Fix:** serve an explicit, sanitized archive snapshot, preferably without live database credentials. If retaining APIs, allowlist public fields and published records. Remove unnecessary endpoints and use database credentials incapable of writing.

   The proxy and omitted paid-provider keys are useful, but they are **not two independent protections against database writes**: the deployment retains the Supabase service-role key. The original production app also remains connected to that database with its old endpoints. Securing one hostname does not secure the shared data.

2. **Stop making backup depend on the PNG walkthrough.**

   [HANDOFF.md:155](/Users/edwinhidalgo/Documents/verified-fan-app/HANDOFF.md:155) blocks backup behind a UI test. My September plan prescribed that sequence. **It was wrong.** A backup does not certify a release.

   **Fix:** inspect outgoing history for secrets and confidential material, then back up the branches and both historical tags immediately. Keep the PNG walkthrough as an integration check. Do not let it block preservation or isolated model experimentation.

3. **Keep HANDOFF.md, but remove its unsupported authority claims.**

   The ledger and stale-document inventory are good.

   Concrete corrections:

   - Actual HEAD is `86d516b`, not `d4b85d8`; `main` is seven commits behind this branch, not three.
   - Row 7 says memory is verified; §3 and SPIKE-STACK’s open questions say it is unmeasured.
   - §8 says find an artist in parallel; the approved Track A/B direction says no approach until the demonstration works.
   - “Current and trustworthy” includes the old brief, which still contains the retracted universal-erasure claim, overstated demand inference and obsolete repository state.
   - Important operative documents remain outside the repository despite the repository-as-source-of-truth rule.

   **Fix:** distinguish *measured here*, *reported upstream*, *proposed* and *unknown*. Attach evidence and dates to consequential claims. Bring the operative specification into the repository and mark earlier plans historical.

4. **The archive version correction was right; the verification claim remains too broad.**

   [HANDOFF.md:239](/Users/edwinhidalgo/Documents/verified-fan-app/HANDOFF.md:239) reports identical extracted text. That establishes text parity—not visual parity, working playback, correct cover art or complete historical fidelity.

   **Fix:** retain screenshots at fixed viewport sizes, playback checks and sanitized data fixtures. Show a historical/read-only notice before users encounter disabled operations. Compare against a retained reference, not indefinitely against another live deployment.

   Similarly, Story IDs, transaction hashes and resolving IPFS metadata are evidence worth preserving. They do not alone establish successful on-chain registration. Verify transaction success, network, registration events and asset linkage. My earlier instruction to label the whole path mocked was also too strong.

5. **Keep the Track A/B separation, but remove the second generation-engine project from the critical path.**

   Separating permission infrastructure from model quality is sensible. Integrating `everything-hums` introduces another engine, asset licence chain, nondeterminism problem and revocation boundary without answering whether artist adapters produce useful music.

   **Fix:** build Track A against a tiny generation interface and explicitly labelled test grants; connect the actual adapter worker when Track B passes. Keep the palette route as an optional demonstration only if it is already trivial to reuse.

   Under the current no-artist rule, the two-week result is a **technical feasibility demonstration**. It cannot simultaneously satisfy the original contract’s explicitly consented artist-adapter demonstration. Record that scope change openly.

**B. WHAT I WOULD DO NEXT IF I OWNED THIS**

1. **Back up the work and close the archive’s unnecessary data exposure.** These protect existing work and credibility before creating new obligations. Do not put confidential spike data in the shared public audio bucket.

2. **Replace the approval document with a bounded feasibility authorization.** Specify exact upstream revisions, checkpoint IDs, applicable terms, permitted data, one experiment, cash allocation and start/end dates. Start the clock when spike implementation or model feasibility work starts—not only when an optimizer finally runs.

3. **Resolve the data supply before substantial training.** Identify actual files, usable minutes, independent songs, licences, instrumental/vocal status and held-out songs. “An FMA artist with enough catalogue” is currently a dependency, not a dataset. Use only outputs demonstrably generated by Edwin for any synthetic smoke test; the handoff explicitly says 29 legacy tracks belong to other users.

4. **Measure one complete local cycle.** Pre-encode, train briefly, save, reload and generate with an adapter. Record process memory, MLX memory, swap, seconds per step and generation time at the intended clip duration. Small can test plumbing; assess the intended quality model before interpreting a quality failure. Stop after a bounded feasibility gate if the remaining work cannot fit.

5. **Run one useful adapter before funding the whole ladder.** Establish whether it improves over the unchanged inference model on fixed, content-only prompts. If it produces obvious copying, poor audio or no useful difference, investigate that before multiplying experiments.

6. **If that works, run a small exploratory ladder with a locked final evaluation.** Keep one model and training recipe across conditions. Separate checkpoint-selection material from final test prompts and references. Report preference, quality, prompt adherence and copying separately. A negative small study is inconclusive about the true minimum.

7. **Connect permission checks, execution receipts and revocation to that same worker.** Test denied requests, queued work, loaded adapters and output delivery. Finish with retained outputs, failures, costs, limitations and a decision. Approach an artist afterward, consistent with Edwin’s instruction, under a separately explicit consent-validation milestone.

I would **not** spend this spike on rank 32, multi-artist stacking, bespoke mastering, a full palette-engine integration, a comprehensive captioning comparison or consumer-app polish. I would not reassign other users’ tracks to Edwin as housekeeping. I would not treat Replicate as a ready fallback merely because the app already calls its generation API.

**C. WHAT IS WRONG**

1. **The memory claim crosses runtimes without evidence.**

   [SPIKE-STACK.md:74](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:74) copies genuine upstream figures but changes their meaning. The ~6.5/~5.5 GB table appears under a requirement for a **CUDA GPU**. It is not a benchmark of MLX training on a 16 GB M4. [Upstream training guide](https://github.com/Stability-AI/stable-audio-3/blob/main/docs/workflows/lora.md)

   The current MLX trainer loads the base in **FP16**; it does not expose the quoted `--base_precision` option. Its reported peak counter is reset after loading, and optional demonstrations can load additional model components. Measure the whole process, not just one counter. [MLX trainer](https://raw.githubusercontent.com/Stability-AI/stable-audio-3/main/optimized/mlx/scripts/lora_train_mlx.py)

   Unified memory also serves macOS and other applications. Batch size, duration, activations, optimizer state and caches matter.

   **Correction:** “MLX training is supported upstream; whether the selected configuration fits this machine with acceptable throughput is unverified.” It may fit. “Fits with headroom” and “memory we do not need” are unjustified.

2. **The licence conclusion is directionally reasonable; “the only bar” is false.**

   [SPIKE-STACK.md:57](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:57) omits commercial registration, attribution/notice obligations, acceptable-use restrictions, termination provisions and the revenue test’s inclusion of affiliates and revenue unrelated to ekos. Output ownership is qualified by applicable law and is only **as between you and Stability**; it does not clear third-party rights. [Community License](https://stability.ai/community-license-agreement)

   The LoRA quotation comes from Stability’s FAQ, not the agreement text. It supports adapter use but does not replace reviewing the agreement. [Licensing FAQ](https://stability.ai/license)

   SA3 also incorporates T5Gemma under separate Gemma terms. Pin the terms for the exact base, inference checkpoint and redistributed components. [Model card](https://huggingface.co/stabilityai/stable-audio-3-medium)

   **Correction:** “Commercial adapter use appears available under specified conditions.” Not “licence clear, only one restriction.”

3. **“Edwin owns the catalogue; zero licensing exposure” is unsupported.**

   SA3’s licence does not establish the terms governing earlier SA2.5 outputs delivered through Replicate. Check the applicable service/model terms and actual authorship of each selected output. Even contractual permission to use an output does not guarantee copyright protection or absence of third-party claims.

   More immediately, HANDOFF’s own row 9 contradicts treating the entire ekos catalogue as Edwin’s. Administrative control of storage is not ownership.

4. **The Jamendo premise is stale, and the proposed distinction is legally imprecise.**

   Jamendo filed a voluntary dismissal on **August 13, 2026**. Reporting identifies it as without prejudice. Calling that action “currently suing” or “live” in the September proposal is wrong on the available record. Dismissal is not a merits ruling that training was lawful. [Docket](https://dockets.justia.com/docket/massachusetts/madce/1%3A2026cv12966/302906), [dismissal report](https://www.musicbusinessworldwide.com/jamendo-drops-its-copyright-infringement-lawsuit-against-suno-six-weeks-after-filing-it/)

   The allegations involved noncommercial licence restrictions, compilation rights and website terms. That is not interchangeable with compliant use of an individual CC-BY recording.

   Creative Commons expressly says its licences can authorize uses involving new technology, including AI, subject to their conditions. **AI-specific wording is ekos’s stronger consent standard, not a universal prerequisite for copyright permission.** [CC’s AI guidance](https://creativecommons.org/faq/#artificial-intelligence-and-cc-licenses)

   Rejecting Jamendo for reputational reasons is a defensible policy choice. Switching to FMA does not, by itself, resolve the consent-brand problem.

5. **“Commercially usable FMA” is not adequate clearance or adequate experimental data.**

   FMA’s metadata licence is distinct from each recording’s licence. The original dataset contains mixed licences; its common small/medium/large packages contain 30-second excerpts, while the full package contains untrimmed tracks. These are recordings, not production stems. [FMA repository](https://github.com/mdeff/fma)

   A commercial-use filter can still include ShareAlike or NoDerivatives conditions. Check exact licence versions, source terms, attribution, modifications, composition/master rights and third-party samples. CC-BY does not broadly license publicity rights or imply endorsement. [CC-BY legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en)

   The proposal names neither the claimed published configuration nor a qualifying artist. That deserves an **unresolved** label.

   The full-rate correction is right. But 16 kHz data creates a bandwidth mismatch and possible fidelity bias; it does not prove every adapted output will have a hard bandwidth ceiling.

6. **Track A’s preview analysis is not cleared by discarding the audio.**

   The proposal rejects iTunes previews for training while treating palette extraction as clean. Apple’s published Search API terms restrict previews to promotional purposes, prohibit independent entertainment use and restrict downloading/caching. Local processing and a small derived JSON do not establish compliance. [Apple’s terms](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html)

   Use an owned or appropriately licensed fixture. Also audit the recorded voice bank’s rights: selecting a recording from a bank introduces rights obligations of its own.

7. **The trigger-token rationale is technically wrong.**

   [SPIKE-STACK.md:143](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:143) confuses **conditioning** with **authorization**.

   The server can check the grant, load the adapter, inject a token internally and record the actual execution. A user typing that token does not load an absent adapter. Revocation works by disabling the controlled execution path either way.

   The proposed trainer freezes T5Gemma and learns adapter parameters. This is not a learned-token-embedding experiment; the assertion that all artist information squeezes through one embedding is false for this pipeline. [Trainer implementation](https://raw.githubusercontent.com/Stability-AI/stable-audio-3/main/optimized/mlx/scripts/lora_train_mlx.py)

   Neither method guarantees selectivity, freedom from incidental-feature learning or artist recognition. Omitting names also does not prevent voice imitation.

   **Fix:** content-only captions are a reasonable initial engineering choice. Delete the ideological justification and misleading comparison table. A trigger-token comparison is optional empirical work, not a test of whether consent architecture remains valid.

8. **The prompt controls do not isolate the claimed effect.**

   [SPIKE-STACK.md:177](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:177) says any base response to an artist’s name confounds every adapter result. Incorrect: a matched base control lets you measure incremental adapter effects even when the base has relevant capabilities.

   The main comparison should hold prompt, seed, duration, sampler, guidance and inference checkpoint constant, changing only adapter condition. “Unmodified base” must distinguish the training BASE checkpoint from the deployed ARC inference checkpoint.

   One different artist’s name cannot establish what **any name** does. It introduces different genre, familiarity and token effects. Missing cells further limit interactions.

   Use the same content prompt with/without the target name, plus a neutral invented label if name effects matter. Keep name routing as a separate policy test. It does not need to consume half the quality experiment.

9. **The data-floor experiment has neither a clean quantity variable nor adequate power.**

   [SPIKE-STACK.md:205](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:205) calls nested datasets a “pure quantity ladder.” Nesting also changes repertoire, instrumentation, production and caption coverage. One arbitrarily chosen song may be unusually representative—or unusually unrepresentative.

   Equal steps give smaller datasets more repetitions per example; equal epochs give larger datasets more optimization steps. Choose which question you are answering and record both training exposure and unique audio. Overlapping crops and stems do not create independent songs.

   The ~20–50-clip guidance is a starting recommendation, **not an established artist-recognition threshold**. It cannot simultaneously be treated as a proven floor and the quantity this experiment will discover.

   As written, the matrix could mean only two outputs per cell. Two unanimous independent forced-choice results have chance probability **25%**. Three listeners judging the same outputs do not turn them into six independent generations.

   Even with **16 independent pairs**, a one-sided 5% binomial test requiring at least 12 wins has only about **45% power** when the true preference rate is 70%. Prompt clustering and comparisons across several conditions make inference harder.

   **Correction:** this can identify a promising configuration for one selected dataset. It cannot reliably locate a minimum, and failure cannot establish that a particular data size is insufficient. Three differently sized adapters are not three replications.

10. **Checkpoint selection can manufacture the reported winner.**

    Eight checkpoints per condition are eight opportunities to select noise. Selecting the checkpoint, strength or caption strategy on the final listening material contaminates the final evaluation.

    Saving checkpoints is cheap; evaluating them is not. Eight checkpoints × three adapters × eight prompts × two seeds means **384 adapted generations**, before base controls, trigger experiments and reruns.

    **Fix:** use a small development set for checkpoint selection, freeze the selected configuration, then evaluate untouched prompts/seeds and held-out songs. Preserve unsuccessful outputs.

    “DoRA ≥ LoRA” is not a universal guarantee, and learning rate is not intrinsically the least informative variable. Rank 16 and `1e-4` are defaults worth trying, not established findings.

11. **The listening and memorization tests need different questions.**

    “Which is by the same artist?” falsely suggests authorship. Ask which better matches specified characteristics of held-out references. Measure absolute usefulness separately: an adapter can beat a poor base and still be unusable.

    Include same-genre distractors and real same-artist references as listening controls. Otherwise the panel may recognize instrumentation rather than artist-specific characteristics. Two or three musicians supply useful judgments; they do not establish broad artist acceptance.

    Baseline similarity alone does not validate a copying detector. Test known copied excerpts, transformed copies and unrelated same-genre negatives. Search across training tracks using local alignment, then review flagged passages. A detector that misses a deliberately inserted copy cannot support a clean result.

    Loudness-match comparisons. Defer bespoke mastering: it introduces another intervention and more evaluator work.

12. **Revocation is about control over execution and copies, not artifact size.**

    [SPIKE-STACK.md:248](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:248) says delete the grant. That destroys historical authorization evidence.

    **Fix:** retain immutable grant versions, mark revocation with an effective timestamp and deny subsequent authorized use. Check at worker execution and define what happens if revocation arrives before output delivery.

    An adapter may already be merged into an in-memory model. Deleting its file does not unload that model. Test pristine → adapted → pristine execution, queued jobs and concurrent requests.

    A browser-delivered 1 KB palette can also be copied and retained. Smallness does not make revocation stronger. State that revocation stops ekos-controlled use; it cannot recall distributed assets.

    Receipts should record worker-observed execution, including model/adapter hashes, inference settings, grant version, outcome and output hash. A receipt can document a nondeterministic execution without reproducing it bit for bit. “Cannot reproduce itself, therefore not a receipt” is false.

13. **The legal schema is oversold.**

    AB 2602 does not categorically void every insufficiently specific digital-replica grant. It addresses particular personal/professional-services provisions, defined voice/likeness replicas and multiple conditions, including representation requirements and an exception. It does not mandate database booleans or generally regulate instrumental style resemblance. [Enacted text](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2602)

    Keep pathway permissions and specific descriptions because they improve consent. Do not present them as statutory compliance achieved by schema.

    Likewise, UMG’s announcement says **more than 24 issued and allowed patents**, not 24+ issued patents. Avoiding payments does not establish freedom to operate for generation or authorization. Deferring counsel is a scope decision with residual risk, not a legal safe harbour. [UMG announcement](https://www.universalmusic.com/music-ip-holdings-unveils-groundbreaking-patent-portfolio-and-license-for-ai-music-creation-with-udio-and-grai-as-first-adopters/)

14. **The budget and clock do not reconcile.**

    [SPIKE-STACK.md:216](/Users/edwinhidalgo/Documents/verified-fan-app/SPIKE-STACK.md:216) redirects GPU money while keeping the full $60 fallback reserve. That leaves $40 for everything else until the reserve is released. No listener fees, evaluation hours or revised totals are specified.

    Moving the artist honorarium after the spike also moves the original artist-validation outcome after the spike.

    Approval supposedly authorizes day-one feasibility but not starting the clock, while the first training run starts it. Track A could consume substantial implementation time outside this accounting.

    **Fix:** one dated 14-day implementation window, explicit cash allocations, measured labor and throughput, and a clearly named outcome: **technical feasibility now; genuine consent validation later unless a real grant is actually obtained.**