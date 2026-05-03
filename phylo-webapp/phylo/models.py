from django.conf import settings
from django.db import models


class AnalysisRun(models.Model):
    ANALYSIS_CHOICES = [
        ("UPGMA", "Distance-based UPGMA"),
        ("NJ", "Distance-based Neighbor Joining"),
        ("FOUR_POINT", "Four-point condition"),
        ("HIERARCHICAL", "Hierarchical clustering"),
        ("PARSIMONY", "Character-based Parsimony"),
        ("FITCH", "Fitch parsimony"),
        ("SANKOFF", "Sankoff parsimony"),
        ("PERFECT_PHYLOGENY", "Perfect phylogeny"),
        ("MP", "Maximum parsimony (search)"),
        ("ML", "Maximum likelihood (JC69)"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=180, blank=True)
    analysis_type = models.CharField(max_length=20, choices=ANALYSIS_CHOICES)
    input_payload = models.TextField()
    result_payload = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username} | {self.analysis_type} | {self.created_at:%Y-%m-%d %H:%M}"
