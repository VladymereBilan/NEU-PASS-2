# mobilefacenet.tflite — provenance and license

**Architecture:** MobileFaceNet (Chen et al., ["MobileFaceNets: Efficient CNNs for
Accurate Real-Time Face Verification on Mobile Devices"](https://arxiv.org/abs/1804.07573)),
trained using an InsightFace-style additive angular margin loss.

**Source of this file:** downloaded from
https://github.com/MCarlomagno/FaceRecognitionAuth (`assets/mobilefacenet.tflite`).
Cross-checked against a second, independent repository
(`syaringan357/Android-MobileFaceNet-MTCNN-FaceAntiSpoofing`) whose bundled
`MobileFaceNet.tflite` is byte-size-identical to within container/metadata
noise (5,233,552 vs 5,233,396 bytes) — this is a commonly-circulated community
conversion, not a one-off file from a single unverified source.

**License:** models in this lineage trace back to
[InsightFace](https://github.com/deepinsight/insightface), whose README states
plainly: *"The code of InsightFace is released under the MIT License... The
training data containing the annotation (and the models trained with these
data) are available for non-commercial research purposes only."*

**This means: this specific model file is licensed for non-commercial research
use only** — which covers this capstone project, but **does NOT cover a real
commercial or Play Store production release** as-is. Before any such release,
this file must be replaced with either a commercially-licensed model, a
custom-trained model on properly consented data, or InsightFace's commercial
licensing must be obtained directly (see their README for contact details).

No genuinely clean, freely-licensed, ready-to-use pretrained face-embedding
model exists publicly today — this is true of essentially every such model
available, not specific to this one. See the project's migration/roadmap plan
for the fuller due-diligence trail behind this decision.
