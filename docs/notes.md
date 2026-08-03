# Notes

## 2026.07.07 Meeting with FV

### done

- create a recommendation builder draft -- interesting? sure

### questions

- what to focus on next?
- lots of permutations to focus on

### guidelines

- recommendations:
  - how can AI help? increase
  - click

- constraint:
  - don't have enough resources to pay facilitation

- how to do this?
  - which AI feature, which stage?

create report? process design

- given 10 r

add to recommendation:

- process design, AI, multi-modal solution, gamification
- ethical considerations

critique:

- constraints not clear: need other

- add criteria

able to do this?

goal of tool:

- be flexible for future admin to change criteria

recommendations:

- populate as an example

ask:

- flexible infrastructure
- recommendations 2-3 recommendations
- authentication: simple password

dim:

- email to ask

Francesco:

- 8-9am in the morning to chat; July 21 - first week not reachable, 28 August.
- Holiday until 6-7 August

help design high quality deliberative process

if you produce recommendation, need to flag ethical

## 2026.06.17 Meeting with FV

### done:

- updated github and deliberr package with data disclaimer (still waiting for package to update)
- created new version of dpdt (delibero): https://delibero.netlify.app/
- read the comments for the pnas paper & suggested revisions

### questions:

- are these the right questions to ask? any other constraint we need to ask about? if so, what is the recommendation attached to it?
  1. constraints: guide the selection of recommendations
  2. goals (rank principles)
  3. recommendations
- do we want to save people's information? e.g., name/email, answers to questions? This can be a question at the end: "Would you like professional support to achieve your goals?"
- is this tool designed for people hosting large scale deliberations only? or small deliberations too? if so, what is small and what is large? I would suggest keeping it open.

### other proposals:

- name: delibero
- domain: delibero.io, delibero.ch -- relatively cheap domains

### pnas reviews:

My third concern relates to robustness. The overall pattern of results is compelling, but additional sensitivity analyses would increase confidence in the findings. In particular, I would appreciate further evidence regarding the stability of DRI estimates across different case selections, the effect of the number of model generations sampled, and the robustness of the binary pass/fail classification based on permutation thresholds. Because much of the interpretation ultimately rests on differences in the probability of exceeding a significance threshold, demonstrating that these conclusions are stable under alternative specifications would strengthen the manuscript considerably.

R3: My third concern relates to robustness. The overall pattern of results is compelling, but additional sensitivity analyses would increase confidence in the findings. In particular, I would appreciate further evidence regarding the:

- [TODO] stability of DRI estimates across different case selections:
  - alpha/variance -- ICC requires permutation
    -               frequency of p values: > 0.95
    - 1: model X:
  - leave-one-out (LOO) case stability

  - top models remain the same?

- [DONE] the effect of the number of model generations sampled
  - alpha and variance for N, variance
  - could we could report alpha
- [DONE] robustness of the binary pass/fail classification based on permutation thresholds:
  - permutation with diff thresholds: we did .0.05, now do: .01, 0.001

- [TODO] write up appendix

deadline: Jun 25

next: FV brownbag in Aarau

### collecting data?

- demoscan:
- feasible, good

# analytics

- IP/city

be aware that if you're doing this..

warning:

-

recommendation:

- problem with self-selection

### decision-tree levels

- (deliberation) size
- (participation) level: inform-empower
- (participation) mode: on/off/hybrid
  - consider: async vs. sync; maybe no: small group/big group?
- (participation) criteria: self/sortition

### reframed principles

- I want more people to participate (inclusion)
- I want a wide variety of ideas (plurality)
- I want a wide variety of people (equality)
- I want deeper discussions (reflection)
- I want honest ideas (authenticity)

### what to consider for recommendations:

- process design "I want sortition" = recruitment stage
- recommendation: surface tension (pro/con) + how to resolve tension

### prioritization/personalization questions

- participant demographics
- available resources
- goals (ranked principles)

## 2026.06.08 Working on tool v1

questions
recommendations

## ethical requirements?

- what is ethical guideline?
-

## 2026.05.27 Meeting with Francesco

Tensions and strategies

Short-listed

Proof-of-concept level...

Decision process:

- Here's the advice... now how to step back.

Output

Variants:

- 40 recommendations link to constraint: not in the guidelines

Requirements for AI tool;

Variants: created by Claude;

modify deliberr / GitHub description to include:

- https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/6OKNOY
- https://www.cambridge.org/core/journals/american-political-science-review/article/how-deliberation-happens-enabling-deliberative-reason/6558F69855ADA8B15BF2EC2E5D403E71#supplementary-materials

- for a alternative version of this dataset, see XX.
