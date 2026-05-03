# Generated manually for extended lab analysis types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("phylo", "0002_alter_analysisrun_analysis_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="analysisrun",
            name="analysis_type",
            field=models.CharField(
                choices=[
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
                ],
                max_length=20,
            ),
        ),
    ]
