from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .services import parse_character_input, parse_distance_input


class ServiceParserTests(TestCase):
    def test_parse_distance_input_roundtrip(self) -> None:
        taxa, matrix = parse_distance_input(
            "A,B,C,D",
            "0,5,9,9\n5,0,10,10\n9,10,0,8\n9,10,8,0",
        )
        self.assertEqual(taxa, ["A", "B", "C", "D"])
        self.assertEqual(len(matrix), 4)

    def test_parse_character_input_multi_taxa(self) -> None:
        data = parse_character_input("A:ATGC\nB:ATGT\nC:CTGC\nD:CTGT")
        self.assertEqual(len(data), 4)
        self.assertEqual(data["A"], "ATGC")


class AlgoLabAccessTests(TestCase):
    def test_dashboard_redirects_when_not_authenticated(self) -> None:
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 302)

    def test_authenticated_user_can_open_algo_lab(self) -> None:
        User.objects.create_user(username="labuser", password="StrongPass123")
        self.client.login(username="labuser", password="StrongPass123")
        response = self.client.get(reverse("algo_lab"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Algorithm lab")

    def test_legacy_distance_post_redirects_with_message(self) -> None:
        User.objects.create_user(username="legacy", password="StrongPass123")
        self.client.login(username="legacy", password="StrongPass123")
        response = self.client.post(reverse("distance_analysis"), data={})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("algo_lab"))
