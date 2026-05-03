from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User


class StyledAuthenticationForm(AuthenticationForm):
    """Widgets for the elegant login template."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs.update(
            {
                "class": "phylo-control",
                "placeholder": "Your username",
                "autocomplete": "username",
            }
        )
        self.fields["password"].widget.attrs.update(
            {
                "class": "phylo-control",
                "placeholder": "••••••••",
                "autocomplete": "current-password",
            }
        )


class RegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        placeholders = {
            "username": "Choose a username",
            "email": "Enter your email",
            "password1": "Create a password",
            "password2": "Confirm password",
        }
        for name, field in self.fields.items():
            field.widget.attrs["class"] = "phylo-control"
            if name in placeholders:
                field.widget.attrs["placeholder"] = placeholders[name]
            field.help_text = ""
        self.fields["username"].widget.attrs["autocomplete"] = "username"
        self.fields["email"].widget.attrs["autocomplete"] = "email"
        self.fields["password1"].widget.attrs["autocomplete"] = "new-password"
        self.fields["password2"].widget.attrs["autocomplete"] = "new-password"


class DistanceTreeForm(forms.Form):
    METHOD_CHOICES = [
        ("UPGMA", "UPGMA"),
        ("NJ", "Neighbor Joining (NJ)"),
    ]

    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)
        for _name, field in self.fields.items():
            field.widget.attrs.setdefault("class", "")
            field.widget.attrs["class"] = f"phylo-control {field.widget.attrs['class']}".strip()

    title = forms.CharField(max_length=180, required=False)
    method = forms.ChoiceField(choices=METHOD_CHOICES, initial="UPGMA")
    taxa = forms.CharField(
        help_text="Comma-separated taxa. Example: A,B,C,D",
        widget=forms.TextInput(attrs={"placeholder": "A,B,C,D"}),
    )
    matrix = forms.CharField(
        widget=forms.Textarea(
            attrs={
                "rows": 6,
                "placeholder": "0,5,9,9\n5,0,10,10\n9,10,0,8\n9,10,8,0",
            }
        ),
        help_text="One matrix row per line, comma-separated values.",
    )


class CharacterTreeForm(forms.Form):
    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, **kwargs)
        for _name, field in self.fields.items():
            field.widget.attrs.setdefault("class", "")
            field.widget.attrs["class"] = f"phylo-control {field.widget.attrs['class']}".strip()

    title = forms.CharField(max_length=180, required=False)
    character_block = forms.CharField(
        widget=forms.Textarea(
            attrs={
                "rows": 6,
                "placeholder": "Taxon1:ATGCA\nTaxon2:ATGGA\nTaxon3:CTGCA\nTaxon4:CTGGA",
            }
        ),
        help_text="Exactly 4 taxa. One line per taxon using Taxon:SEQUENCE.",
    )
